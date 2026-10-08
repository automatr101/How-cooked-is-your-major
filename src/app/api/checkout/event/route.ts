import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { funnelAlert } from "@/lib/payments/alerts";
import { guard, json, readBody } from "@/lib/payments/http";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";

// "Someone clicked Unlock." The browser reports it so it can reach Telegram (the later steps are seen by the server
// itself). It carries only the major's name, which is looked up here, so nothing but real majors can ever be announced.
// Same guards as every payment route: payments on, private gate open, no hammering.

const WINDOW_MS = 10 * 60 * 1000;

export async function POST(req: NextRequest) {
  const blocked = guard(req, "checkout-event", 30);
  if (blocked) return blocked;

  const body = await readBody(req, 512);
  const major = findMajor(body?.major);
  if (body?.event !== "unlock_clicked" || !major) return json({ error: "bad_request" }, 400);

  const ua = req.headers.get("user-agent") ?? "";
  // The same visitor clicking the same major again within ten minutes is one alert, not several
  if (ua && !BOT_UA.test(ua) && !rateLimited(`unlock-alert:${clientIp(req)}:${major.slug}`, 1, WINDOW_MS)) {
    funnelAlert(req, "unlock", major);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
