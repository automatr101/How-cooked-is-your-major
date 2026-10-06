import { NextRequest, NextResponse } from "next/server";
import { findMajor, getProvider, REFERENCE_PATTERN } from "@/lib/payments";
import { grantEntitlement } from "@/lib/payments/entitlement";
import { guard, json, readBody } from "@/lib/payments/http";
import { PRICE_CURRENCY, PRICE_VALUE, PRODUCT_NAME } from "@/lib/premium";

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

  const provider = getProvider();
  if (!provider) return json({ error: "not_available" }, 404);

  try {
    const result = await provider.verify({ reference, majorSlug: major.slug, proof });
    if (result.status !== "success") return json({ status: result.status, reason: result.reason ?? null });

    const out = NextResponse.json(
      { status: "success", transactionId: result.transactionId ?? reference, value: PRICE_VALUE, currency: PRICE_CURRENCY, itemName: PRODUCT_NAME },
      { headers: { "Cache-Control": "no-store" } }
    );
    grantEntitlement(req, out, major.slug, reference);
    return out;
  } catch {
    console.error("[checkout] verification could not be completed");
    return json({ status: "error", reason: "provider_unavailable" }, 502);
  }
}
