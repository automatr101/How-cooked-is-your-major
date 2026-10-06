import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { hasEntitlement } from "@/lib/payments/entitlement";
import { guard, json } from "@/lib/payments/http";
import { buildPlan } from "@/lib/plan/generate";

// The paid report. Built here, on the server, and only for a browser whose signed unlock cookie says it
// paid for this major. Everyone else gets 402, so the content is never in the page for non-buyers.

export async function GET(req: NextRequest) {
  const blocked = guard(req, "plan", 120);
  if (blocked) return blocked;

  const major = findMajor(req.nextUrl.searchParams.get("major"));
  if (!major) return json({ error: "unknown_major" }, 400);
  if (!hasEntitlement(req, major.slug)) return json({ error: "payment_required" }, 402);

  return json({ plan: buildPlan(major) });
}
