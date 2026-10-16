import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { guard } from "@/lib/payments/http";
import { previewOf } from "@/lib/plan/preview";

// The paywall's preview: two real recommendations from the plan for this major, and counts of the rest. It is the same
// text the buyer gets, but only two items of it. Open to everyone (it is the sales page), behind the same payments-on /
// private-gate / rate-limit guard as the other payment routes.

export async function GET(req: NextRequest) {
  const blocked = guard(req, "plan-preview", 120);
  if (blocked) return blocked;

  const major = findMajor(req.nextUrl.searchParams.get("major"));
  if (!major) return Response.json({ error: "unknown_major" }, { status: 400, headers: { "Cache-Control": "no-store" } });

  // The same major always gives the same preview, so the browser may keep it for an hour
  return Response.json({ preview: previewOf(major) }, { headers: { "Cache-Control": "private, max-age=3600" } });
}
