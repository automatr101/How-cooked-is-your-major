import { NextRequest } from "next/server";
import { EMAIL_PATTERN } from "@/lib/payments";
import { crossSite } from "@/lib/same-origin";
import { cleanText } from "@/lib/clean-text";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { ambassadorsEnabled, AmbassadorStoreError, createAmbassador, dashboardToken } from "@/lib/ambassadors/store";
import { SITE_URL } from "@/lib/site";

// Campus ambassador sign-up. Name, email and campus, plus the ticked box agreeing to the program terms on /ambassadors.
// The answer carries the ambassador's share link and their private stats link (shown once on screen: email sending is not on yet).
//
// GET  -> { enabled }
// POST -> { ok, link, dashboard }

const MAX_BODY_BYTES = 1024;
const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  return reply({ enabled: ambassadorsEnabled() });
}

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply({ error: "forbidden" }, 403);
  if (!ambassadorsEnabled()) return reply({ error: "not_available" }, 503);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply({ error: "bad_request" }, 400);
  if (rateLimited(`ambassador:${clientIp(req)}`, 4, 60 * 60 * 1000)) return reply({ error: "too_many_requests" }, 429);

  let body: Record<string, unknown>;
  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return reply({ error: "too_big" }, 413);
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return reply({ error: "too_big" }, 413);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply({ error: "bad_request" }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  if (typeof body.hp === "string" && body.hp.length > 0) return reply({ ok: true }); // a bot filled the hidden field

  const name = cleanText(body.name, 60);
  const campus = cleanText(body.campus, 80);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (name.length < 2) return reply({ error: "name_required" }, 400);
  if (campus.length < 2) return reply({ error: "campus_required" }, 400);
  if (email.length > 120 || !EMAIL_PATTERN.test(email)) return reply({ error: "invalid_email" }, 400);
  if (body.consent !== true) return reply({ error: "consent_required" }, 400);

  let amb;
  try {
    amb = await createAmbassador({ name, email, campus });
  } catch (err) {
    console.error("[ambassadors] could not sign up", err instanceof AmbassadorStoreError ? err.message : "");
    return reply({ error: "unavailable" }, 502);
  }
  // Same answer shape whether or not the address exists would hide sign-ups, but then the person could never get their link.
  // Saying "already signed up" reveals only that an address is an ambassador, and the stats link itself is never re-sent here.
  if (!amb) return reply({ error: "already_signed_up" }, 409);

  if (telegramEnabled()) {
    await sendTelegram([`🎓 <b>New campus ambassador</b>`, `👤 ${escapeHtml(amb.name)} · ${escapeHtml(amb.campus)}`, `🔗 code: ${escapeHtml(amb.code)}`, visitorLine(req)].join("\n"));
  }
  return reply({ ok: true, code: amb.code, link: `${SITE_URL}/?ref=${amb.code}`, dashboard: `${SITE_URL}/ambassadors/me?t=${dashboardToken(amb.id)}` });
}
