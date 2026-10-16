import { NextRequest, NextResponse } from "next/server";
import { findMajor, getProvider, REFERENCE_PATTERN } from "@/lib/payments";
import { SESSION_ID, stripeEnabled, stripeProvider } from "@/lib/payments/stripe";
import { grantEntitlement } from "@/lib/payments/entitlement";
import { funnelAlert } from "@/lib/payments/alerts";
import { guard, json, readBody } from "@/lib/payments/http";
import { registerPurchase } from "@/lib/payments/purchases";
import { findPurchase, statusOf, storeEnabled } from "@/lib/payments/store";
import { currentPrice } from "@/lib/payments/price";
import { PAYMENTS_MODE, PRODUCT_NAME, priceOf } from "@/lib/premium";

// Step 2: ask the provider whether the payment really happened. This is the ONLY place that grants the
// unlock cookie, and it does so only when the provider (not the browser) says "success" for this exact
// reference, major and price. A browser that merely claims it paid gets nothing.

export async function POST(req: NextRequest) {
  const blocked = guard(req, "checkout-verify", 60);
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
    let result = await provider.verify({ reference, majorSlug: major.slug, proof, session });
    // "Restore by payment reference" for a Stripe purchase: Stripe cannot find a session from the reference alone, but our own
    // purchase record (made when the payment was verified) can. Only for a paid, un-refunded purchase of THIS major.
    if (!session && result.status === "failed" && result.reason === "no_payment_found" && stripeEnabled() && storeEnabled()) {
      try {
        const known = await findPurchase(reference);
        if (known && known.status === "paid" && known.major_slug === major.slug) {
          result = { status: "success", transactionId: reference, amountMinor: known.amount_minor, currency: known.currency };
        }
      } catch {
        console.error("[checkout] could not look up a purchase by reference");
      }
    }
    if (result.status !== "success") {
      // A buyer who came back without a completed payment. "Pending" is skipped: it is checked again every few seconds.
      if (result.status === "failed" || result.status === "cancelled") {
        const why = [result.reason, result.detail].filter(Boolean).join(" · ");
        funnelAlert(req, "not_completed", major, [`Status: ${result.status}${why ? ` · ${why}` : ""}`, `🧾 ${reference}`], `${reference}:${result.status}`);
      }
      return json({ status: result.status, reason: result.reason ?? null });
    }

    // Live mode with a database: a payment that was refunded no longer unlocks anything, and a verified one is recorded
    if (PAYMENTS_MODE === "live" && storeEnabled()) {
      try {
        if ((await statusOf(reference)) === "refunded") return json({ status: "failed", reason: "refunded" });
      } catch {
        console.error("[checkout] could not check the refund status"); // a database problem must not block a paying customer
      }
      await registerPurchase({
        reference,
        major,
        paystackId: result.transactionId,
        email: result.customerEmail,
        paid: result.amountMinor != null && result.currency ? { amount: result.amountMinor, currency: result.currency } : undefined,
        provider: provider.id === "stripe" || result.currency === "USD" ? "stripe" : "paystack",
      });
    }

    // The revenue figure is what was paid (the launch price if the buyer paid that), not whatever the price is by now
    const price = result.amountMinor != null && result.currency ? priceOf(result.currency, result.amountMinor) : currentPrice();
    const out = NextResponse.json(
      { status: "success", transactionId: result.transactionId ?? reference, value: price.value, currency: price.currency, itemName: PRODUCT_NAME },
      { headers: { "Cache-Control": "no-store" } }
    );
    grantEntitlement(req, out, major.slug, reference);
    return out;
  } catch {
    console.error("[checkout] verification could not be completed");
    return json({ status: "error", reason: "provider_unavailable" }, 502);
  }
}
