import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { mayRead } from "@/lib/payments/access";
import { guard, json } from "@/lib/payments/http";
import { buildPlan } from "@/lib/plan/generate";

// The paid report. Built here, on the server, and only for a browser whose signed unlock cookie says it
// paid for this major (and whose payment has not been refunded). Everyone else gets 402, so the content is
// never in the page for non-buyers.

export async function GET(req: NextRequest) {
  const blocked = guard(req, "plan", 120);
  if (blocked) return blocked;

  const major = findMajor(req.nextUrl.searchParams.get("major"));
  if (!major) return json({ error: "unknown_major" }, 400);
  if (!(await mayRead(req, major.slug))) return json({ error: "payment_required" }, 402);

  return json({ plan: buildPlan(major) });
}
