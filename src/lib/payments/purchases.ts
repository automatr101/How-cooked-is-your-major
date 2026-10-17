import { PLAN_COPY, planTypeFor } from "@/lib/premium";
import { escapeHtml, sendTelegram, telegramEnabled } from "@/lib/telegram";
import { charge } from "./paystack";
import { hashEmail, recordPurchase, storeEnabled } from "./store";
import { bundleKey } from "./bundle";

// SERVER ONLY. What happens the first time a verified payment is seen. Called from two places that can both be
// the first to see a payment: the buyer's browser coming back (/api/checkout/verify) and Paystack's own message
// (/api/paystack/webhook). Whichever arrives first records it and sends the "New purchase" alert; the other finds
// it already recorded and stays quiet.

const alerted = new Set<string>(); // fallback when there is no database: per server instance, best effort

export async function registerPurchase(input: {
  reference: string;
  major: { name: string; slug: string; score: number };
  paystackId?: string;
  email?: string;
  /** What Paystack says was paid. Falls back to the normal charge when absent. */
  paid?: { amount: number; currency: string };
  /** Which provider took the payment (default Paystack). Only used for the alert wording. */
  provider?: "paystack" | "stripe";
  /** A 3-major bundle: all three majors (input.major is the first). Stored as one row. */
  bundle?: { name: string; slug: string; score: number }[];
}): Promise<void> {
  const planType = planTypeFor(input.major.score);
  const paid = input.paid ?? charge(); // what was actually paid (the launch price if that is what the buyer paid)
  let isNew: boolean;

  if (storeEnabled()) {
    try {
      isNew = await recordPurchase({
        reference: input.reference,
        major_slug: input.bundle ? bundleKey(input.bundle) : input.major.slug,
        plan_type: planType,
        amount_minor: paid.amount,
        currency: paid.currency,
        paystack_id: input.paystackId ?? null,
        email_hash: input.email ? hashEmail(input.email) : null,
        status: "paid",
      });
    } catch {
      // A database problem must never stop a paying customer or a payment alert
      console.error("[purchases] could not save a purchase");
      isNew = !alerted.has(input.reference);
    }
  } else {
    isNew = !alerted.has(input.reference);
  }

  alerted.add(input.reference);
  if (isNew && telegramEnabled()) {
    await sendTelegram(
      [
        (input.provider === "stripe" ? process.env.STRIPE_SECRET_KEY : process.env.PAYSTACK_SECRET_KEY)?.trim().match(/^(sk|rk)_test_/) ? "🧪 <b>TEST purchase</b> (test key, no real money)" : "💰 <b>New purchase</b>",
        input.bundle
          ? `📦 3-major bundle: ${input.bundle.map((b) => `${escapeHtml(b.name)} (${b.score}%)`).join(" + ")}`
          : `📚 ${escapeHtml(input.major.name)} (${input.major.score}%) · ${escapeHtml(PLAN_COPY[planType].name)}`,
        `💵 ${(paid.amount / 100).toFixed(2)} ${paid.currency}${input.provider === "stripe" ? " via Stripe" : ""}`,
        `🧾 ${escapeHtml(input.reference)}`,
      ].join("\n")
    );
  }
}
