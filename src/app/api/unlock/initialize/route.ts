import { NextRequest } from "next/server";
import { EMAIL_PATTERN, findMajor, getProviderFor, newReference } from "@/lib/payments";
import { guard, json, readBody } from "@/lib/payments/http";
import { SafeError } from "@/lib/payments/types";
import { gateActive } from "@/lib/payments/gate";
import { cleanText } from "@/lib/clean-text";
import { experimentActiveFor, mayView } from "@/lib/unlock/access";
import { unlockAlert } from "@/lib/unlock/alerts";
import { unlockPriceFor } from "@/lib/unlock/view";

// Step 1 of paying to reveal a result. The browser says which major; the server decides the price ($1.99, or the cedi price
// in Ghana), makes the payment reference and creates the payment with the provider. Only while the experiment runs.

export async function POST(req: NextRequest) {
  const blocked = guard(req, "unlock-init", 60);
  if (blocked) return blocked;
  if (!experimentActiveFor(req)) return json({ error: "experiment_ended" }, 404);

  const body = await readBody(req);
  const major = findMajor(body?.major);
  const email = cleanText(body?.email, 120);
  if (!major) return json({ error: "unknown_major" }, 400);
  if (!EMAIL_PATTERN.test(email)) return json({ error: "invalid_email" }, 400);
  // Already unlocked (or they own the plan): nothing to pay for
  if (await mayView(req, major.slug)) return json({ error: "already_unlocked" }, 409);

  const country = req.headers.get("x-vercel-ip-country");
  const provider = getProviderFor(country);
  if (!provider) return json({ error: "not_available" }, 404);

  const reference = newReference();
  try {
    // The way back to the result. It carries no score and no level: a visitor who cancels lands here still locked.
    const callbackUrl = `${new URL(req.url).origin}/?major=${encodeURIComponent(major.name)}&cm_unlock=1`;
    const result = await provider.initialize({ reference, majorSlug: major.slug, majorName: major.name, email, callbackUrl, unlock: true });
    const { price } = unlockPriceFor(country);
    unlockAlert(req, "🔓 <b>Unlock payment started</b> (sent to the payment page)", major, [`${(price.minor / 100).toFixed(2)} ${price.currency}${provider.id === "stripe" ? " via Stripe" : ""}`]);
    return json({ provider: provider.id, reference: result.reference, authorizationUrl: result.authorizationUrl ?? null });
  } catch (err) {
    console.error("[unlock] could not start a payment"); // no details: they may contain keys or the email
    const reason = err instanceof SafeError ? err.message : `unexpected ${err instanceof Error ? err.name : "error"}`;
    unlockAlert(req, "⚠️ <b>Unlock payment could not start</b>", major, [reason]);
    return json({ error: "provider_unavailable", ...(gateActive() ? { detail: reason } : {}) }, 502);
  }
}
