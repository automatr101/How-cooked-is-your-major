import { createHash } from "node:crypto";
import { PRICE_CURRENCY, PRICE_MINOR, PRODUCT_ID, PRODUCT_NAME } from "@/lib/premium";
import { isPaystackPage } from "./paystack-url";
import { activeLaunch, launchMinor } from "./launch";
import { comebackMinor } from "./comeback";
import { BUNDLE_PRODUCT_ID, bundleMetaSlugs, bundleMinor } from "./bundle";
import { SafeError, type InitializeInput, type InitializeResult, type PaymentProvider, type VerifyInput, type VerifyResult } from "./types";

// LIVE MODE. Paystack hosted checkout: the server creates the transaction (the secret key never leaves
// the server), the visitor pays on Paystack's page, comes back, and the server asks Paystack whether
// that exact transaction succeeded for this exact major and amount before anything is unlocked.
//
// Needs PAYSTACK_SECRET_KEY. This file has not been run against Paystack yet (no keys during
// development): test it with Paystack's test keys (sk_test_...) before switching to live.

const API = process.env.PAYSTACK_API_BASE ?? "https://api.paystack.co";

// What is actually charged. By default it is the display price in USD. A Paystack account that cannot take
// USD (a new Ghana account, for example, may only allow GHS) sets PAYSTACK_CURRENCY and
// PAYSTACK_AMOUNT_MINOR (the amount in the smallest unit, e.g. pesewas). The amount is always chosen by
// you: the code never converts currencies or guesses an exchange rate.
export function charge(): { currency: string; amount: number } {
  const currency = (process.env.PAYSTACK_CURRENCY?.trim() || PRICE_CURRENCY).toUpperCase();
  if (currency === PRICE_CURRENCY) return { currency, amount: PRICE_MINOR };
  const amount = Number(process.env.PAYSTACK_AMOUNT_MINOR?.trim());
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new SafeError(`PAYSTACK_AMOUNT_MINOR must be a whole number when PAYSTACK_CURRENCY is ${currency}`);
  }
  return { currency, amount };
}

/**
 * What a payment started RIGHT NOW is charged: the lowest of the normal price, the launch price (while the launch runs) and the
 * comeback price (when this visitor holds a running comeback offer).
 */
export function activeCharge(now: Date = new Date(), comeback = false): { currency: string; amount: number } {
  const regular = charge();
  const launch = activeLaunch(regular.amount, now);
  const amount = Math.min(regular.amount, launch ? launch.minor : Infinity, comeback ? comebackMinor(regular.amount) : Infinity);
  return { currency: regular.currency, amount };
}

// Which payment options Paystack's page offers. Left unset, Paystack shows every channel enabled on the account (Settings >
// Preferences > Payment channels). Set PAYSTACK_CHANNELS to a comma list (for example "card,mobile_money") to pin the page
// to those. Only Paystack's own channel names are accepted; anything else is ignored. A channel that is not enabled on the
// account is not shown even if it is listed here, so this can narrow the page but cannot add a channel the account lacks.
const CHANNELS = new Set(["card", "bank", "ussd", "qr", "mobile_money", "bank_transfer", "eft", "apple_pay"]);
export function channels(): string[] | undefined {
  const list = (process.env.PAYSTACK_CHANNELS ?? "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter((c) => CHANNELS.has(c));
  return list.length ? [...new Set(list)] : undefined;
}

function key(): string {
  const k = process.env.PAYSTACK_SECRET_KEY?.trim(); // a pasted key often carries a stray space or newline
  if (!k) throw new SafeError("PAYSTACK_SECRET_KEY is not set");
  if (!/^sk_(test|live)_[A-Za-z0-9]+$/.test(k)) throw new SafeError("PAYSTACK_SECRET_KEY does not look like a Paystack secret key");
  return k;
}

// Which key is configured, without revealing it: its type and a short one-way fingerprint. Only ever shown to the
// owner (the gated checkout error), so a wrong key (live instead of test, another business) is visible at a glance.
function keyHint(): string {
  const k = process.env.PAYSTACK_SECRET_KEY?.trim() ?? "";
  const kind = k.startsWith("sk_live_") ? "live" : k.startsWith("sk_test_") ? "test" : "unknown";
  return `${kind} key #${createHash("sha256").update(k).digest("hex").slice(0, 6)}`;
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(10000),
  });
  const body = (await res.json().catch(() => null)) as { status?: boolean; message?: string; data?: Record<string, unknown> } | null;
  return { ok: res.ok, httpStatus: res.status, body };
}

/** Paystack's own words for why a payment did not go through ("Insufficient Funds", "Declined"...), kept short. */
function gatewayNote(data: Record<string, unknown>): string | undefined {
  const note = data.gateway_response;
  return typeof note === "string" && note.trim() ? note.trim().slice(0, 80) : undefined;
}

export const paystackProvider: PaymentProvider = {
  id: "paystack",

  async initialize({ reference, majorSlug, majorName, email, callbackUrl, comeback, bundle }: InitializeInput): Promise<InitializeResult> {
    const single = activeCharge(new Date(), comeback);
    // A bundle is twice the NORMAL single price (no launch or comeback discount on top)
    const { currency, amount } = bundle ? { currency: single.currency, amount: bundleMinor(single.currency, charge().amount) } : single;
    const { ok, httpStatus, body } = await call("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount,
        currency,
        reference,
        callback_url: callbackUrl,
        ...(channels() ? { channels: channels() } : {}),
        // Read back at verify time. Set here, on the server, so the browser cannot change it.
        metadata: bundle
          ? { product: BUNDLE_PRODUCT_ID, product_name: `${PRODUCT_NAME} x3`, major_slug: bundleMetaSlugs(bundle), major_name: bundle.map((b) => b.name).join(" + ") }
          : { product: PRODUCT_ID, product_name: PRODUCT_NAME, major_slug: majorSlug, major_name: majorName },
      }),
    });
    const url = body?.data?.authorization_url;
    if (!ok || body?.status !== true || typeof url !== "string") {
      // Paystack's own error text (e.g. "Currency not supported by merchant") holds no secrets and is what you need to fix it.
      const why = `Paystack refused (HTTP ${httpStatus}, ${currency}, ${keyHint()}): ${String(body?.message ?? "no message").slice(0, 200)}`;
      console.error(`[paystack] ${why}`);
      throw new SafeError(why);
    }
    // The browser is sent to this address, so it has to be one of Paystack's own pages. (A test server, which only
    // exists when PAYSTACK_API_BASE points somewhere else, is exempt.)
    if (!process.env.PAYSTACK_API_BASE && !isPaystackPage(url)) {
      console.error("[paystack] the checkout address was not a Paystack page");
      throw new SafeError("Paystack returned a checkout address that is not a Paystack page");
    }
    return { reference, authorizationUrl: url };
  },

  async verify({ reference, majorSlug, bundle }: VerifyInput): Promise<VerifyResult> {
    const { ok, httpStatus, body } = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (httpStatus === 404) return { status: "failed", reason: "no_payment_found" };
    if (!ok || body?.status !== true || !body.data) throw new Error("Paystack verification failed");

    const d = body.data;
    const meta = (d.metadata ?? {}) as Record<string, unknown>;

    switch (d.status) {
      case "success": {
        // The transaction is real and paid. Make sure it is the one we created, for this major and price.
        if (d.reference !== reference) return { status: "failed", reason: "reference_mismatch" };
        if (meta.product !== (bundle ? BUNDLE_PRODUCT_ID : PRODUCT_ID) || meta.major_slug !== majorSlug) return { status: "failed", reason: "wrong_product" };
        // The normal price, or the launch price (also after the launch has ended: that payment was started while it ran).
        // The amount is only ever chosen by our server when the payment starts, so no other amount can be paid here.
        const expected = charge();
        const paidMinor = Number(d.amount);
        const launched = launchMinor(expected.amount);
        const allowed = bundle ? [bundleMinor(expected.currency, expected.amount)] : [expected.amount, comebackMinor(expected.amount), ...(launched !== null ? [launched] : [])];
        if (d.currency !== expected.currency || !allowed.includes(paidMinor)) return { status: "failed", reason: "wrong_amount" };
        const email = (d.customer as { email?: unknown } | undefined)?.email;
        return { status: "success", transactionId: String(d.id ?? reference), customerEmail: typeof email === "string" ? email : undefined, amountMinor: paidMinor, currency: String(d.currency) };
      }
      case "abandoned":
        return { status: "cancelled", detail: gatewayNote(d) };
      case "failed":
      case "reversed":
        return { status: "failed", reason: "payment_declined", detail: gatewayNote(d) };
      default:
        return { status: "pending" }; // ongoing, pending, processing, queued
    }
  },
};
