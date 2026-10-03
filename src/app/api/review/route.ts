import { NextRequest } from "next/server";
import { majors } from "@/lib/data";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";

// Star ratings and written reviews, delivered to the Telegram bot. Nothing is stored
// on the site: the Telegram chat is the inbox. Silently does nothing until
// TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.

const MAX_BODY_BYTES = 4096;
const MAX_COMMENT_CHARS = 500;
const MAX_PER_HOUR = 3; // per visitor
const WINDOW_MS = 60 * 60 * 1000;

// Control characters, plus zero-width and bidi-override characters that could be used to
// disguise text in the chat. Checked by code point (not a regex) so the source stays plain ASCII.
function isUnwanted(cp: number): boolean {
  return (
    cp <= 0x1f ||
    cp === 0x7f ||
    (cp >= 0x200b && cp <= 0x200f) || // zero-width space/joiners, LRM/RLM
    (cp >= 0x2028 && cp <= 0x202e) || // line/paragraph separators, bidi embeddings and overrides
    (cp >= 0x2060 && cp <= 0x2069) || // word joiner, invisible operators, bidi isolates
    cp === 0xfeff // byte order mark / zero-width no-break space
  );
}

function cleanComment(raw: unknown): string {
  if (typeof raw !== "string") return "";
  // Array.from walks whole code points, so emoji are never cut in half
  const chars = Array.from(raw).map((ch) => (isUnwanted(ch.codePointAt(0)!) ? " " : ch));
  const flat = chars.join("").replace(/\s+/g, " ").trim();
  return Array.from(flat).slice(0, MAX_COMMENT_CHARS).join("");
}

export async function POST(req: NextRequest) {
  const done = () => new Response(null, { status: 204 });

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

  const text = cleanComment(comment);
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
