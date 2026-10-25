import { NextRequest, NextResponse } from "next/server";
import { findMajor, getProvider, REFERENCE_PATTERN } from "@/lib/payments";
import { SESSION_ID, stripeEnabled, stripeProvider } from "@/lib/payments/stripe";
import { guard, json, readBody } from "@/lib/payments/http";
import { registerPurchase } from "@/lib/payments/purchases";
import { findPurchase, statusOf, storeEnabled } from "@/lib/payments/store";
import { PAYMENTS_MODE, priceOf } from "@/lib/premium";
import { grantUnlock } from "@/lib/unlock/cookie";
import { unlockAlert } from "@/lib/unlock/alerts";
import { UNLOCK_USD_MINOR, unlockKey } from "@/lib/unlock/config";

// Step 2 of paying to reveal a result: ask the PROVIDER (not the browser) whether the payment really happened, for this exact
// reference, major, product and price. This is the only place that writes the unlock cookie, and only on a verified success.
// It still works after the experiment has ended: someone who paid just before the end must get what they paid for.

export async function POST(req: NextRequest) {
  const blocked = guard(req, "unlock-verify", 60);
  if (blocked) return blocked;

  const body = await readBody(req);
  const major = findMajor(body?.major);
  const reference = typeof body?.reference === "string" ? body.reference : "";
  const proof = typeof body?.proof === "string" ? body.proof : undefined;
  if (!major || !REFERENCE_PATTERN.test(reference)) return json({ error: "bad_request" }, 400);

  const session = typeof body?.session === "string" && SESSION_ID.test(body.session) ? body.session : undefined;
  // A buyer coming back from Stripe carries Stripe's session id; everything else is the mode's provider (Paystack, or the fake one)
  const provider = session ? (stripeEnabled() ? stripeProvider : null) : getProvider();
  if (!provider) return json({ error: "not_available" }, 404);

  try {
    let result = await provider.verify({ reference, majorSlug: major.slug, proof, session, unlock: true });
    // "Restore by payment reference" for a Stripe payment: Stripe cannot find a session from the reference alone, but our own
    // purchase record (made when it was verified) can. Only for a paid, un-refunded UNLOCK of THIS major.
    if (!session && result.status === "failed" && result.reason === "no_payment_found" && stripeEnabled() && storeEnabled()) {
      try {
        const known = await findPurchase(reference);
        if (known && known.status === "paid" && known.major_slug === unlockKey(major.slug)) {
          result = { status: "success", transactionId: reference, amountMinor: known.amount_minor, currency: known.currency };
        }
      } catch {
        console.error("[unlock] could not look up a purchase by reference");
      }
    }
    if (result.status !== "success") {
      if (result.status === "failed" || result.status === "cancelled") {
        const why = [result.reason, result.detail].filter(Boolean).join(" · ");
        unlockAlert(req, "❌ <b>Unlock payment not completed</b>", major, [`Status: ${result.status}${why ? ` · ${why}` : ""}`, `🧾 ${reference}`]);
      }
      return json({ status: result.status, reason: result.reason ?? null });
    }

    // Live mode with a database: a refunded payment unlocks nothing, and a verified one is recorded (once: a repeat is ignored)
    if (PAYMENTS_MODE === "live" && storeEnabled()) {
      try {
        if ((await statusOf(reference)) === "refunded") return json({ status: "failed", reason: "refunded" });
      } catch {
        console.error("[unlock] could not check the refund status"); // a database problem must not block a paying customer
      }
      await registerPurchase({
        reference,
        major,
        paystackId: result.transactionId,
        email: result.customerEmail,
        paid: result.amountMinor != null && result.currency ? { amount: result.amountMinor, currency: result.currency } : undefined,
        provider: provider.id === "stripe" || result.currency === "USD" ? "stripe" : "paystack",
        unlock: true,
      });
    }

    const paid = result.amountMinor != null && result.currency ? priceOf(result.currency, result.amountMinor) : priceOf("USD", UNLOCK_USD_MINOR);
    const out = NextResponse.json({ status: "success", transactionId: result.transactionId ?? reference, value: paid.value, currency: paid.currency }, { headers: { "Cache-Control": "no-store" } });
    grantUnlock(req, out, major.slug, reference);
    return out;
  } catch {
    console.error("[unlock] verification could not be completed");
    return json({ status: "error", reason: "provider_unavailable" }, 502);
  }
}
