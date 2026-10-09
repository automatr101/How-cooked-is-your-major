import { NextRequest } from "next/server";
import { majors } from "@/lib/data";
import { cleanText } from "@/lib/clean-text";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";

// Star ratings and written reviews, delivered to the Telegram bot. Nothing is stored
// on the site: the Telegram chat is the inbox. Silently does nothing until
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.

const MAX_BODY_BYTES = 4096;
const MAX_COMMENT_CHARS = 500;
const MAX_PER_HOUR = 3; // per visitor
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const done = () => new Response(null, { status: 204 });

  // Only our own review box posts here: another website must not be able to send reviews through a visitor's browser.
  if (crossSite(req)) return new Response(null, { status: 403 });

  if (!telegramEnabled()) return done();

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return done();

  if (rateLimited(`review:${clientIp(req)}`, MAX_PER_HOUR, WINDOW_MS)) return new Response(null, { status: 429 });

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body !== "object" || body === null) return new Response(null, { status: 400 });
  const { rating, comment, major: majorName, hp } = body as Record<string, unknown>;

  // Hidden field that real visitors never fill in. Bots that do get a normal-looking
  // success so they have no reason to adapt.
  if (typeof hp === "string" && hp.length > 0) return done();

  if (typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return new Response(null, { status: 400 });
  }

  const text = cleanText(comment, MAX_COMMENT_CHARS);
  // Look the major up server-side so only real names and scores can appear.
  const found = typeof majorName === "string" ? majors.find((m) => m.name === majorName) : undefined;

  const stars = "⭐".repeat(rating) + "☆".repeat(5 - rating);
  const message = [
    `${stars} <b>New review</b> (${rating}/5)`,
    text ? `“${escapeHtml(text)}”` : null,
    found ? `📚 ${escapeHtml(found.name)} (${found.score}%)` : null,
    visitorLine(req),
  ]
    .filter(Boolean)
    .join("\n");

  await sendTelegram(message);
  return done();
}
