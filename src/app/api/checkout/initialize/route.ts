import { NextRequest } from "next/server";
import { EMAIL_PATTERN, findMajor, getProvider, newReference } from "@/lib/payments";
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

  const provider = getProvider();
  if (!provider) return json({ error: "not_available" }, 404);

  const reference = newReference();
  try {
    const origin = new URL(req.url).origin;
    const callbackUrl =
      `${origin}/?major=${encodeURIComponent(major.name)}&score=${major.score}&level=${encodeURIComponent(major.level)}&cm_checkout=1`;
    const result = await provider.initialize({ reference, majorSlug: major.slug, majorName: major.name, email, callbackUrl });
    funnelAlert(req, "started", major);
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
