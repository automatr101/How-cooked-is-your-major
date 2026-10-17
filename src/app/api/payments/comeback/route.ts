import { NextRequest, NextResponse } from "next/server";
import { guard, json } from "@/lib/payments/http";
import { activeComeback, COMEBACK_COOKIE, COMEBACK_HOURS, COMEBACK_SEEN_COOKIE, newComeback } from "@/lib/payments/comeback";
import { escapeHtml, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { findMajor } from "@/lib/payments";
import { readBody } from "@/lib/payments/http";

// The page calls this when a visitor is back at the paywall on a later visit. The first time, it starts their 24-hour 30%-off
// offer (a signed cookie); after that it only reports the running offer, and once one has been given out it never starts another
// in this browser. The price itself is always decided by the server from the signed cookie (see comeback.ts).

export async function POST(req: NextRequest) {
  const blocked = guard(req, "comeback", 10);
  if (blocked) return blocked;

  const running = activeComeback(req);
  if (running) return json({ active: true, endsAt: running.endsAt.toISOString() });
  if (req.cookies.get(COMEBACK_SEEN_COOKIE)) return json({ active: false });

  const { value, endsAt } = newComeback();
  const out = NextResponse.json({ active: true, endsAt: endsAt.toISOString() }, { headers: { "Cache-Control": "no-store" } });
  const secure = process.env.NODE_ENV === "production";
  out.cookies.set(COMEBACK_COOKIE, value, { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: COMEBACK_HOURS * 3600 });
  out.cookies.set(COMEBACK_SEEN_COOKIE, "1", { httpOnly: true, sameSite: "lax", secure, path: "/", maxAge: 365 * 24 * 3600 });

  if (telegramEnabled()) {
    const body = await readBody(req);
    const major = findMajor(body?.major);
    await sendTelegram(["🔁 <b>Comeback offer shown</b> (30% off for 24h)", major ? `📚 ${escapeHtml(major.name)} (${major.score}%)` : "", visitorLine(req)].filter(Boolean).join("\n")).catch(() => {});
  }
  return out;
}
