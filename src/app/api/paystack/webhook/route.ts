import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { findMajor, REFERENCE_PATTERN } from "@/lib/payments";
import { paystackProvider } from "@/lib/payments/paystack";
import { PAYMENTS_MODE, PLAN_COPY, PRICE_CURRENCY, PRICE_LABEL, planTypeFor } from "@/lib/premium";
import { escapeHtml, sendTelegram, telegramEnabled } from "@/lib/telegram";

// Paystack calls this address on its own when something happens to a payment. In the Paystack dashboard
// (Settings > API Keys & Webhooks, once for Test mode and once for Live mode) set the webhook URL to:
//   https://how-cooked-is-your-major.vercel.app/api/paystack/webhook
//
// What it does:
//   1. Checks the request really came from Paystack (x-paystack-signature, signed with your secret key).
//   2. On charge.success: asks Paystack again about that exact payment (never trusts the message alone), and
//      if it is a real, correctly priced payment for one of our plans, sends you a Telegram alert.
//   3. On a refund: sends you an alert.
// What it does NOT do: unlock anything. The unlock is a cookie in the buyer's own browser, and a message from
// Paystack's servers has no way to set it. A buyer who paid and closed the tab uses "Restore your plan" in the
// checkout and enters their payment reference (see components/premium/checkout-dialog.tsx).

export const runtime = "nodejs";

const MAX_BODY = 64 * 1024;
const seen = new Set<string>(); // payments already alerted on, per server instance (Paystack may send the same event twice)

function validSignature(raw: string, header: string | null): boolean {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key || !header) return false;
  const expected = Buffer.from(createHmac("sha512", key).update(raw).digest("hex"));
  const given = Buffer.from(header.trim().toLowerCase());
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const ok = () => new Response(null, { status: 200 });

async function alert(lines: string[]) {
  if (telegramEnabled()) await sendTelegram(lines.join("\n"));
}

export async function POST(req: NextRequest) {
  if (PAYMENTS_MODE !== "live") return new Response(null, { status: 404 });

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return new Response(null, { status: 413 });
  const raw = await req.text(); // the signature is over the exact raw text, so read it before parsing
  if (raw.length > MAX_BODY) return new Response(null, { status: 413 });

  if (!validSignature(raw, req.headers.get("x-paystack-signature"))) return new Response(null, { status: 401 });

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }
  const data = event.data ?? {};

  if (event.event === "charge.success") {
    const reference = typeof data.reference === "string" ? data.reference : "";
    // Not ours (the same Paystack account may sell other things): nothing to do
    if (!REFERENCE_PATTERN.test(reference)) return ok();
    if (seen.has(reference)) return ok();

    const meta = (data.metadata ?? {}) as Record<string, unknown>;
    const major = findMajor(meta.major_name);
    if (!major || major.slug !== meta.major_slug) {
      seen.add(reference);
      await alert(["⚠️ <b>Payment I could not match to a plan</b>", `🧾 ${escapeHtml(reference)}`, "Check it in the Paystack dashboard."]);
      return ok();
    }

    let result;
    try {
      // Ask Paystack again: status, reference, product, major, amount and currency are all checked there
      result = await paystackProvider.verify({ reference, majorSlug: major.slug });
    } catch {
      console.error("[paystack-webhook] could not re-check a payment");
      return new Response(null, { status: 500 }); // not a 2xx, so Paystack tries again later
    }

    seen.add(reference);
    if (result.status === "success") {
      const plan = PLAN_COPY[planTypeFor(major.score)].name;
      await alert([
        "💰 <b>New purchase</b>",
        `📚 ${escapeHtml(major.name)} (${major.score}%) · ${escapeHtml(plan)}`,
        `💵 ${PRICE_LABEL} ${PRICE_CURRENCY}`,
        `🧾 ${escapeHtml(reference)}`,
      ]);
    } else {
      await alert([
        "⚠️ <b>Payment did not pass the check</b>",
        `📚 ${escapeHtml(major.name)}`,
        `Reason: ${escapeHtml(result.reason ?? result.status)}`,
        `🧾 ${escapeHtml(reference)}`,
      ]);
    }
    return ok();
  }

  if (event.event === "refund.processed") {
    const ref = typeof data.transaction_reference === "string" ? data.transaction_reference : "";
    if (REFERENCE_PATTERN.test(ref)) await alert(["↩️ <b>Refund processed</b>", `🧾 ${escapeHtml(ref)}`]);
    return ok();
  }

  return ok(); // any other event: acknowledged, ignored
}
