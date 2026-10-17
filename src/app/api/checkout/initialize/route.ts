import { NextRequest } from "next/server";
import { EMAIL_PATTERN, findMajor, getProviderFor, newReference } from "@/lib/payments";
import { stripeCharge } from "@/lib/payments/stripe";
import { activeCharge } from "@/lib/payments/paystack";
import { activeComeback } from "@/lib/payments/comeback";
import { guard, json, readBody } from "@/lib/payments/http";
import { cleanText } from "@/lib/clean-text";
import { funnelAlert } from "@/lib/payments/alerts";
import { gateActive } from "@/lib/payments/gate";
import { SafeError } from "@/lib/payments/types";

// Step 1 of buying a plan. The browser says which major; the server decides the price, makes the
// payment reference and (in live mode) creates the transaction with the provider. No secret key is
// ever needed in the browser.

export async function POST(req: NextRequest) {
  const blocked = guard(req, "checkout-init", 20);
  if (blocked) return blocked;

  const body = await readBody(req);
  const major = findMajor(body?.major);
  const email = cleanText(body?.email, 120);
  if (!major) return json({ error: "unknown_major" }, 400);
  if (!EMAIL_PATTERN.test(email)) return json({ error: "invalid_email" }, 400);

  // Stripe (US dollars) for visitors outside Ghana when it is switched on, otherwise the mode's provider (Paystack in Ghana)
  const provider = getProviderFor(req.headers.get("x-vercel-ip-country"));
  if (!provider) return json({ error: "not_available" }, 404);

  const reference = newReference();
  try {
    const origin = new URL(req.url).origin;
    const callbackUrl =
      `${origin}/?major=${encodeURIComponent(major.name)}&score=${major.score}&level=${encodeURIComponent(major.level)}&cm_checkout=1`;
    // The comeback offer comes from a cookie our server signed; the browser cannot ask for it any other way
    const comeback = !!activeComeback(req);
    const result = await provider.initialize({ reference, majorSlug: major.slug, majorName: major.name, email, callbackUrl, comeback });
    const paid = provider.id === "stripe" ? { ...stripeCharge(new Date(), comeback), provider: "Stripe" } : provider.id === "paystack" && comeback ? activeCharge(new Date(), true) : undefined;
    funnelAlert(req, "started", major, comeback ? ["🔁 comeback offer (30% off)"] : [], undefined, paid);
    return json({ provider: provider.id, reference: result.reference, authorizationUrl: result.authorizationUrl ?? null });
  } catch (err) {
    console.error("[checkout] could not start a payment"); // no details: they may contain keys or the email
    // Only messages written to be safe are passed on; anything else is reduced to its error type (a library's
    // message could echo a header or a key). The owner's Telegram alert always gets it; the browser only while the
    // private gate is on, because then the only visitor who can get here is the owner.
    const reason = err instanceof SafeError ? err.message : `unexpected ${err instanceof Error ? err.name : "error"}`;
    funnelAlert(req, "not_started", major, [reason]);
    return json({ error: "provider_unavailable", ...(gateActive() ? { detail: reason } : {}) }, 502);
  }
}
