import { createHash } from "node:crypto";
import { PRICE_CURRENCY, PRICE_MINOR, PRODUCT_ID, PRODUCT_NAME } from "@/lib/premium";
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

export const paystackProvider: PaymentProvider = {
  id: "paystack",

  async initialize({ reference, majorSlug, majorName, email, callbackUrl }: InitializeInput): Promise<InitializeResult> {
    const { currency, amount } = charge();
    const { ok, httpStatus, body } = await call("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount,
        currency,
        reference,
        callback_url: callbackUrl,
        // Read back at verify time. Set here, on the server, so the browser cannot change it.
        metadata: { product: PRODUCT_ID, product_name: PRODUCT_NAME, major_slug: majorSlug, major_name: majorName },
      }),
    });
    const url = body?.data?.authorization_url;
    if (!ok || body?.status !== true || typeof url !== "string") {
      // Paystack's own error text (e.g. "Currency not supported by merchant") holds no secrets and is what you need to fix it.
      const why = `Paystack refused (HTTP ${httpStatus}, ${currency}, ${keyHint()}): ${String(body?.message ?? "no message").slice(0, 200)}`;
      console.error(`[paystack] ${why}`);
      throw new SafeError(why);
    }
    return { reference, authorizationUrl: url };
  },

  async verify({ reference, majorSlug }: VerifyInput): Promise<VerifyResult> {
    const { ok, httpStatus, body } = await call(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (httpStatus === 404) return { status: "failed", reason: "no_payment_found" };
    if (!ok || body?.status !== true || !body.data) throw new Error("Paystack verification failed");

    const d = body.data;
    const meta = (d.metadata ?? {}) as Record<string, unknown>;

    switch (d.status) {
      case "success": {
        // The transaction is real and paid. Make sure it is the one we created, for this major and price.
        if (d.reference !== reference) return { status: "failed", reason: "reference_mismatch" };
        if (meta.product !== PRODUCT_ID || meta.major_slug !== majorSlug) return { status: "failed", reason: "wrong_product" };
        const expected = charge();
        if (d.currency !== expected.currency || Number(d.amount) !== expected.amount) return { status: "failed", reason: "wrong_amount" };
        const email = (d.customer as { email?: unknown } | undefined)?.email;
        return { status: "success", transactionId: String(d.id ?? reference), customerEmail: typeof email === "string" ? email : undefined };
      }
      case "abandoned":
        return { status: "cancelled" };
      case "failed":
      case "reversed":
        return { status: "failed", reason: "payment_declined" };
      default:
        return { status: "pending" }; // ongoing, pending, processing, queued
    }
  },
};
