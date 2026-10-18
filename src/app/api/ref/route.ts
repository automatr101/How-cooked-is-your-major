import { NextRequest, NextResponse } from "next/server";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";
import { ambassadorsEnabled, CODE_PATTERN, countClick, REF_COOKIE, REF_DAYS } from "@/lib/ambassadors/store";

// The page calls this once when a visitor arrives by /?ref=<code>. An active ambassador code is kept in an httpOnly cookie for
// 30 days (the last ambassador link clicked wins), so a purchase days later is still credited. Unknown or paused codes are
// ignored. A visit is counted at most once per visitor per code per day.

export async function POST(req: NextRequest) {
  const done = (counted: boolean) => NextResponse.json({ ok: counted }, { headers: { "Cache-Control": "no-store" } });
  if (crossSite(req) || !ambassadorsEnabled()) return done(false);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return done(false);

  let code = "";
  try {
    const body = await req.json();
    code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : "";
  } catch {
    return done(false);
  }
  if (!CODE_PATTERN.test(code)) return done(false);
  if (rateLimited(`ref:${clientIp(req)}`, 20, 60 * 60 * 1000)) return done(false);

  const repeat = req.cookies.get(REF_COOKIE)?.value === code || rateLimited(`ref:${clientIp(req)}:${code}`, 1, 24 * 60 * 60 * 1000);
  let active: boolean;
  try {
    active = repeat ? true : await countClick(code);
  } catch {
    return done(false);
  }
  if (!active) return done(false);

  const res = done(!repeat);
  res.cookies.set(REF_COOKIE, code, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: REF_DAYS * 24 * 3600 });
  return res;
}
