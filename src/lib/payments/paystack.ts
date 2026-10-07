import { PRICE_CURRENCY, PRICE_MINOR, PRODUCT_ID, PRODUCT_NAME } from "@/lib/premium";
import type { InitializeInput, InitializeResult, PaymentProvider, VerifyInput, VerifyResult } from "./types";

// LIVE MODE. Paystack hosted checkout: the server creates the transaction (the secret key never leaves
// the server), the visitor pays on Paystack's page, comes back, and the server asks Paystack whether
// that exact transaction succeeded for this exact major and amount before anything is unlocked.
//
// Needs PAYSTACK_SECRET_KEY. This file has not been run against Paystack yet (no keys during
// development): test it with Paystack's test keys (sk_test_...) before switching to live.

const API = process.env.PAYSTACK_API_BASE ?? "https://api.paystack.co";

function key(): string {
  const k = process.env.PAYSTACK_SECRET_KEY;
  if (!k) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return k;
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
    const { ok, body } = await call("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({
        email,
        amount: PRICE_MINOR,
        currency: PRICE_CURRENCY,
        reference,
        callback_url: callbackUrl,
        // Read back at verify time. Set here, on the server, so the browser cannot change it.
        metadata: { product: PRODUCT_ID, product_name: PRODUCT_NAME, major_slug: majorSlug, major_name: majorName },
      }),
    });
    const url = body?.data?.authorization_url;
    if (!ok || body?.status !== true || typeof url !== "string") throw new Error("Paystack could not start the payment");
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
        if (d.currency !== PRICE_CURRENCY || Number(d.amount) !== PRICE_MINOR) return { status: "failed", reason: "wrong_amount" };
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
