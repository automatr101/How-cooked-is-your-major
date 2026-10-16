import { NextRequest } from "next/server";
import { findMajor, REFERENCE_PATTERN } from "@/lib/payments";
import { PAYMENTS_MODE } from "@/lib/premium";
import { registerPurchase } from "@/lib/payments/purchases";
import { markPaid, markRefunded, storeEnabled } from "@/lib/payments/store";
import { referenceOfIntent, SESSION_ID, stripeEnabled, stripeProvider, validStripeSignature } from "@/lib/payments/stripe";
import { escapeHtml, sendTelegram, telegramEnabled } from "@/lib/telegram";

// Stripe calls this address on its own. In the Stripe dashboard (Developers > Webhooks > Add endpoint, once for Test mode and
// once for Live mode) set the URL to:
//   https://how-cooked-is-your-major.vercel.app/api/stripe/webhook
// and listen for: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded, refund.failed.
// Copy the endpoint's signing secret (whsec_...) into Vercel as STRIPE_WEBHOOK_SECRET.
//
// What it does (the same as the Paystack webhook):
//   1. Checks the request really came from Stripe (Stripe-Signature, signed with the webhook secret, five minute window).
//   2. On a paid Checkout Session: asks Stripe again about that exact session (never trusts the message alone) and, if it is a real
//      payment for one of our plans at a price we set, records the purchase and sends the "New purchase" alert (once: the buyer's
//      own return may have got there first).
//   3. On a full refund: takes plan access away and tells you; a partial refund only alerts you. A refund that fails gives access back.
// What it does NOT do: unlock anything. The unlock is a cookie in the buyer's own browser; a message from Stripe's servers cannot set it.

export const runtime = "nodejs";

const MAX_BODY = 256 * 1024;
const seen = new Set<string>(); // events already handled, per server instance (Stripe may send the same event twice)

const ok = () => new Response(null, { status: 200 });

async function alert(lines: string[]) {
  if (telegramEnabled()) await sendTelegram(lines.join("\n"));
}

export async function POST(req: NextRequest) {
  if (PAYMENTS_MODE !== "live" || !stripeEnabled()) return new Response(null, { status: 404 });

  if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY) return new Response(null, { status: 413 });
  const raw = await req.text(); // the signature is over the exact raw text, so read it before parsing
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });
  if (!validStripeSignature(raw, req.headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET)) return new Response(null, { status: 401 });

  let event: { id?: string; type?: string; data?: { object?: Record<string, unknown> } };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const obj = event.data?.object ?? {};
  if (event.id && seen.has(event.id)) return ok();

  // ---- a paid Checkout Session
  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const id = typeof obj.id === "string" ? obj.id : "";
    const reference = typeof obj.client_reference_id === "string" ? obj.client_reference_id : "";
    const meta = (obj.metadata ?? {}) as Record<string, unknown>;
    if (!SESSION_ID.test(id) || !REFERENCE_PATTERN.test(reference)) return ok(); // not one of ours: nothing to do
    const major = findMajor(meta.major_name);
    if (!major || major.slug !== meta.major_slug) {
      if (event.id) seen.add(event.id);
      await alert(["⚠️ <b>Stripe payment I could not match to a plan</b>", `🧾 ${escapeHtml(reference)}`, "Check it in the Stripe dashboard."]);
      return ok();
    }
    let result;
    try {
      result = await stripeProvider.verify({ reference, majorSlug: major.slug, session: id }); // asks Stripe again
    } catch {
      console.error("[stripe-webhook] could not re-check a payment");
      return new Response(null, { status: 500 }); // not a 2xx, so Stripe tries again later
    }
    if (event.id) seen.add(event.id);
    if (result.status === "success") {
      await registerPurchase({
        reference,
        major,
        paystackId: result.transactionId,
        email: result.customerEmail,
        paid: result.amountMinor != null && result.currency ? { amount: result.amountMinor, currency: result.currency } : undefined,
        provider: "stripe",
      });
    } else if (result.status === "failed") {
      await alert(["⚠️ <b>Stripe payment did not pass the check</b>", `📚 ${escapeHtml(major.name)}`, `Reason: ${escapeHtml(result.reason ?? result.status)}`, `🧾 ${escapeHtml(reference)}`]);
    }
    return ok();
  }

  // ---- refunds
  if (event.type === "charge.refunded") {
    const intent = typeof obj.payment_intent === "string" ? obj.payment_intent : "";
    const ref = intent ? await referenceOfIntent(intent).catch(() => null) : null;
    if (event.id) seen.add(event.id);
    if (!ref || !REFERENCE_PATTERN.test(ref)) return ok(); // a charge that is not ours
    const full = obj.refunded === true || (Number(obj.amount_refunded) > 0 && Number(obj.amount_refunded) >= Number(obj.amount));
    if (!full) {
      await alert(["↩️ <b>Partial refund on Stripe</b> (plan access kept)", `🧾 ${escapeHtml(ref)}`]);
      return ok();
    }
    let changed = true;
    if (storeEnabled()) {
      try {
        changed = await markRefunded(ref); // a refunded purchase no longer unlocks or restores
      } catch {
        console.error("[stripe-webhook] could not mark a refund");
      }
    }
    if (changed) await alert(["↩️ <b>Refund on Stripe</b> (plan access removed)", `🧾 ${escapeHtml(ref)}`]);
    return ok();
  }

  if (event.type === "refund.failed") {
    const intent = typeof obj.payment_intent === "string" ? obj.payment_intent : "";
    const ref = intent ? await referenceOfIntent(intent).catch(() => null) : null;
    if (event.id) seen.add(event.id);
    if (!ref || !REFERENCE_PATTERN.test(ref)) return ok();
    let restored = true;
    if (storeEnabled()) {
      try {
        restored = await markPaid(ref);
      } catch {
        console.error("[stripe-webhook] could not restore a purchase after a failed refund");
      }
    }
    if (restored) await alert(["⚠️ <b>Stripe refund failed</b> (plan access restored)", `🧾 ${escapeHtml(ref)}`, "Check it in the Stripe dashboard."]);
    return ok();
  }

  return ok(); // events we do not use
}
