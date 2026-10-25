import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { extendedRoast } from "@/lib/leads/content";
import { experimentActiveFor, mayView } from "@/lib/unlock/access";

// Share-to-unlock: the extended roast (3 more roasts + the major's numbers), for a visitor who just shared their result.
// It is free content, so this does not try to prove the share happened; it is rate limited and same-site only. Nothing about
// the visitor is stored. Telegram gets a short "shared to unlock" line.

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const VIA = new Set(["twitter", "whatsapp", "copy_link", "native_share", "download", "other"]);

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply({ error: "forbidden" }, 403);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply({ error: "bad_request" }, 400);
  if (rateLimited(`extended:${clientIp(req)}`, 30, 60 * 60 * 1000)) return reply({ error: "too_many_requests" }, 429);

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 512) return reply({ error: "too_big" }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  const major = findMajor(body?.major);
  if (!major) return reply({ error: "unknown_major" }, 400);
  // During the paid-unlock experiment the extended roast (it carries the score) is part of the locked result
  if (experimentActiveFor(req) && !(await mayView(req, major.slug))) return reply({ error: "locked" }, 402);
  const via = typeof body.via === "string" && VIA.has(body.via) ? body.via : "other";

  if (telegramEnabled()) {
    await sendTelegram([`📤 <b>Shared to unlock</b> (${escapeHtml(via)})`, `📚 ${escapeHtml(major.name)} (${major.score}%)`, visitorLine(req)].join("\n")).catch(() => {});
  }
  return reply({ extended: extendedRoast(major) });
}
