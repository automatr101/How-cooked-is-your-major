import { PLAN_COPY, planTypeFor } from "@/lib/premium";
import { escapeHtml, sendTelegram, telegramEnabled } from "@/lib/telegram";
import { charge } from "./paystack";
import { hashEmail, recordPurchase, storeEnabled } from "./store";

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
}): Promise<void> {
  const planType = planTypeFor(input.major.score);
  const paid = charge(); // what is actually charged (USD $4.99 by default; see PAYSTACK_CURRENCY)
  let isNew: boolean;

  if (storeEnabled()) {
    try {
      isNew = await recordPurchase({
        reference: input.reference,
        major_slug: input.major.slug,
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
        process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_") ? "🧪 <b>TEST purchase</b> (test key, no real money)" : "💰 <b>New purchase</b>",
        `📚 ${escapeHtml(input.major.name)} (${input.major.score}%) · ${escapeHtml(PLAN_COPY[planType].name)}`,
        `💵 ${(paid.amount / 100).toFixed(2)} ${paid.currency}`,
        `🧾 ${escapeHtml(input.reference)}`,
      ].join("\n")
    );
  }
}
