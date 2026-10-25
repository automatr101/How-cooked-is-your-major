import { NextRequest } from "next/server";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { findMajor } from "@/lib/payments";

// "Where did you hear about us?" answers, sent to the owner as a private Telegram alert (the same answer also goes to GA4
// from the page). Only the fixed list of channels is accepted; nothing typed by the visitor, nothing stored.

const CHANNELS: Record<string, string> = {
  tiktok: "TikTok",
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  reddit: "Reddit",
  whatsapp: "WhatsApp",
  friend: "A friend",
  google: "Google",
  other: "Somewhere else",
};

const done = (code = 204) => new Response(null, { status: code, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (crossSite(req)) return done(403);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return done();
  if (rateLimited(`heard:${clientIp(req)}`, 10, 60 * 60 * 1000)) return done(429);

  let channel = "";
  let majorName: unknown;
  try {
    const text = await req.text();
    if (text.length > 300) return done(413);
    const body = JSON.parse(text) as { channel?: unknown; major?: unknown };
    channel = typeof body.channel === "string" ? body.channel : "";
    majorName = body.major;
  } catch {
    return done(400);
  }
  const label = CHANNELS[channel];
  if (!label) return done(400);
  const major = findMajor(majorName);

  if (telegramEnabled()) {
    await sendTelegram([`🧭 <b>Heard about us:</b> ${escapeHtml(label)}`, major ? `📚 after scanning ${escapeHtml(major.name)} (${major.score}%)` : "", visitorLine(req)].filter(Boolean).join("\n"));
  }
  return done();
}
