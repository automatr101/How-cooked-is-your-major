import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { json } from "@/lib/payments/http";
import { clientIp, rateLimited } from "@/lib/telegram";
import { gateActive } from "@/lib/payments/gate";
import { experimentWindow } from "@/lib/unlock/config";
import { experimentActiveFor, mayView } from "@/lib/unlock/access";
import { unlockPriceFor } from "@/lib/unlock/view";

// "May THIS browser see the result for this major right now?" The page asks this before it shows a result while the
// paid-unlock experiment runs. The answer comes from the server (the signed unlock cookie, and the payment behind it not
// being refunded), never from anything the browser claims. With the experiment off, ended or closed to this visitor,
// everything is unlocked.
//
// GET /api/unlock/status?major=Law -> { active, unlocked, endsAt?, price?, approx?, provider? }

export async function GET(req: NextRequest) {
  if (!experimentActiveFor(req)) return json({ active: false, unlocked: true });
  if (rateLimited(`unlock-status:${clientIp(req)}`, 300, 60 * 60 * 1000)) return json({ error: "too_many_requests" }, 429);

  const major = findMajor(new URL(req.url).searchParams.get("major"));
  if (!major) return json({ error: "bad_request" }, 400);

  const unlocked = await mayView(req, major.slug);
  const { price, provider, approx } = unlockPriceFor(req.headers.get("x-vercel-ip-country"));
  return json({ active: true, unlocked, gated: gateActive(), endsAt: experimentWindow().endsAt, price, provider, ...(approx ? { approx } : {}) });
}
