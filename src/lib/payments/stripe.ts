import { createHmac, timingSafeEqual } from "node:crypto";
import { PAYMENTS_MODE, PRICE_CURRENCY, PRICE_MINOR, PRODUCT_ID, PRODUCT_NAME } from "@/lib/premium";
import { activeLaunchUsd, launchUsdMinor } from "./launch";
import { SafeError, type InitializeInput, type InitializeResult, type PaymentProvider, type VerifyInput, type VerifyResult } from "./types";

// Stripe Checkout, for visitors OUTSIDE Ghana (or everyone, see STRIPE_AUDIENCE), charged in US dollars. Ghana keeps Paystack
// (Mobile Money, cedis). The flow mirrors the Paystack one: the SERVER creates a Checkout Session (the secret key never leaves
// the server and the amount is chosen here, never by the browser), the buyer pays on Stripe's own page, comes back, and the
// server asks Stripe whether THAT session is paid, for THIS major, at a price WE set, before anything is unlocked.
//
//   STRIPE_SECRET_KEY       sk_test_... or sk_live_... (or a restricted rk_ key allowed to write Checkout Sessions and read
//                           Checkout Sessions and PaymentIntents). Without it Stripe is completely off.
//   STRIPE_WEBHOOK_SECRET   whsec_..., from the webhook endpoint /api/stripe/webhook (records purchases and refunds)
//   STRIPE_AUDIENCE         "outside-ghana" (default): Stripe for visitors whose country is known and is not Ghana.
//                           "everyone": Stripe for all visitors (Paystack is then not offered).
//
// No Stripe package is installed: this talks to Stripe's REST API directly with fetch and checks webhook signatures by hand
// (HMAC-SHA256 over "timestamp.body", with a five minute tolerance), which keeps the dependency list as it was.

const API = process.env.STRIPE_API_BASE ?? "https://api.stripe.com";

/** A Checkout Session id as Stripe makes them. Anything else is refused before it goes anywhere near Stripe. */
export const SESSION_ID = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

function key(): string {
  const k = process.env.STRIPE_SECRET_KEY?.trim();
  if (!k) throw new SafeError("STRIPE_SECRET_KEY is not set");
  if (!/^(sk|rk)_(test|live)_[A-Za-z0-9]+$/.test(k)) throw new SafeError("STRIPE_SECRET_KEY does not look like a Stripe secret key");
  return k;
}

/** Is Stripe switched on at all? Live payments mode and a well-formed key. Never true in the fake-checkout test mode. */
export function stripeEnabled(): boolean {
  if (PAYMENTS_MODE !== "live") return false;
  try {
    key();
    return true;
  } catch {
    return false;
  }
}

/** Should THIS visitor pay with Stripe? `country` is the two-letter code Vercel puts in x-vercel-ip-country. */
export function stripeAudience(country: string | null): boolean {
  if (process.env.STRIPE_AUDIENCE === "everyone") return true;
  // Outside Ghana means a known country that is not Ghana. An unknown visitor stays on Paystack (the home market).
  return !!country && /^[A-Za-z]{2}$/.test(country) && country.toUpperCase() !== "GH";
}

/** What a Stripe payment started RIGHT NOW is charged, in US dollars (the launch dollar price while a launch runs). */
export function stripeCharge(now: Date = new Date()): { currency: string; amount: number } {
  const launch = activeLaunchUsd(PRICE_MINOR, now);
  return { currency: PRICE_CURRENCY, amount: launch ? launch.minor : PRICE_MINOR };
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(10000),
  });
  const body = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, httpStatus: res.status, body };
}

const isStripePage = (raw: string): boolean => {
  try {
    const u = new URL(raw);
    return u.protocol === "https:" && !u.username && !u.password && (u.hostname === "stripe.com" || u.hostname.endsWith(".stripe.com"));
  } catch {
    return false;
  }
};

export const stripeProvider: PaymentProvider = {
  id: "stripe",

  async initialize({ reference, majorSlug, majorName, email, callbackUrl }: InitializeInput): Promise<InitializeResult> {
    const { currency, amount } = stripeCharge();
    const f = new URLSearchParams();
    f.set("mode", "payment");
    f.set("line_items[0][quantity]", "1");
    f.set("line_items[0][price_data][currency]", currency.toLowerCase());
    f.set("line_items[0][price_data][unit_amount]", String(amount));
    f.set("line_items[0][price_data][product_data][name]", `${PRODUCT_NAME} (${majorName})`.slice(0, 120));
    f.set("client_reference_id", reference);
    f.set("customer_email", email);
    // The buyer comes back to the result page with the reference and Stripe's own session id (Stripe fills in the
    // {CHECKOUT_SESSION_ID} placeholder), which is what the server uses to ask Stripe whether it was paid.
    f.set("success_url", `${callbackUrl}&reference=${encodeURIComponent(reference)}&sid={CHECKOUT_SESSION_ID}`);
    f.set("cancel_url", callbackUrl.replace(/&cm_checkout=1$/, ""));
    for (const target of ["metadata", "payment_intent_data[metadata]"]) {
      f.set(`${target}[product]`, PRODUCT_ID);
      f.set(`${target}[major_slug]`, majorSlug);
      f.set(`${target}[reference]`, reference);
    }
    f.set("metadata[major_name]", majorName.slice(0, 100));

    const { ok, httpStatus, body } = await call("/v1/checkout/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `cm-init-${reference}` },
      body: f.toString(),
    });
    const url = body?.url;
    if (!ok || typeof url !== "string" || typeof body?.id !== "string") {
      const msg = (body?.error as { message?: unknown } | undefined)?.message;
      const why = `Stripe refused (HTTP ${httpStatus}, ${currency}): ${String(msg ?? "no message").slice(0, 200)}`;
      console.error(`[stripe] ${why}`);
      throw new SafeError(why);
    }
    // The browser is sent to this address, so it has to be one of Stripe's own pages (a test server, which only exists when
    // STRIPE_API_BASE points elsewhere, is exempt).
    if (!process.env.STRIPE_API_BASE && !isStripePage(url)) {
      console.error("[stripe] the checkout address was not a Stripe page");
      throw new SafeError("Stripe returned a checkout address that is not a Stripe page");
    }
    return { reference, authorizationUrl: url };
  },

  async verify({ reference, majorSlug, session }: VerifyInput): Promise<VerifyResult> {
    if (!session || !SESSION_ID.test(session)) return { status: "failed", reason: "no_payment_found" };
    const { ok, httpStatus, body } = await call(`/v1/checkout/sessions/${encodeURIComponent(session)}`);
    if (httpStatus === 404) return { status: "failed", reason: "no_payment_found" };
    if (!ok || !body) throw new Error("Stripe verification failed");

    // The session must be the one we made for this reference and this major
    if (body.client_reference_id !== reference) return { status: "failed", reason: "reference_mismatch" };
    const meta = (body.metadata ?? {}) as Record<string, unknown>;
    if (meta.product !== PRODUCT_ID || meta.major_slug !== majorSlug) return { status: "failed", reason: "wrong_product" };

    if (body.payment_status === "paid") {
      // The normal dollar price, or the dollar launch price (also after it ended: that payment was started while it ran). The
      // amount is only ever chosen by our server when the payment starts.
      const paid = Number(body.amount_total);
      const launched = launchUsdMinor(PRICE_MINOR);
      const currency = String(body.currency ?? "").toUpperCase();
      if (currency !== PRICE_CURRENCY || !(paid === PRICE_MINOR || (launched !== null && paid === launched))) return { status: "failed", reason: "wrong_amount" };
      const email = (body.customer_details as { email?: unknown } | null | undefined)?.email ?? body.customer_email;
      const intent = typeof body.payment_intent === "string" ? body.payment_intent : String(body.id);
      return { status: "success", transactionId: intent, customerEmail: typeof email === "string" ? email : undefined, amountMinor: paid, currency };
    }
    if (body.status === "expired") return { status: "cancelled", detail: "session expired" };
    return { status: "pending" }; // open and unpaid, or a delayed payment method still processing
  },
};

// ---- webhook helpers -------------------------------------------------------------------------------------------------

/** Checks a Stripe-Signature header: HMAC-SHA256 of "timestamp.rawBody" with the webhook secret, and a fresh timestamp. */
export function validStripeSignature(raw: string, header: string | null, secret: string | undefined, nowMs: number = Date.now()): boolean {
  if (!secret || !header) return false;
  const parts = header.split(",").map((p) => p.trim().split("="));
  const t = parts.find(([k]) => k === "t")?.[1];
  const signatures = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !/^\d+$/.test(t) || signatures.length === 0) return false;
  if (Math.abs(nowMs / 1000 - Number(t)) > 300) return false; // a replayed old message
  const expected = Buffer.from(createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex"));
  return signatures.some((s) => {
    const given = Buffer.from(s);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** The payment reference we stored on a PaymentIntent when the session was created (used to find a purchase from a refund). */
export async function referenceOfIntent(intentId: string): Promise<string | null> {
  if (!/^pi_[A-Za-z0-9]+$/.test(intentId)) return null;
  const { ok, body } = await call(`/v1/payment_intents/${encodeURIComponent(intentId)}`);
  const ref = (body?.metadata as Record<string, unknown> | undefined)?.reference;
  return ok && typeof ref === "string" ? ref : null;
}
