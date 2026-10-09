import { NextRequest } from "next/server";
import { cleanText } from "@/lib/clean-text";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";

// Messages from the contact form, delivered to the Telegram bot (the chat is the inbox; nothing is
// stored on the site). Does nothing until TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set.

const MAX_BODY_BYTES = 8192;
const MAX_NAME = 80;
const MAX_EMAIL = 120;
const MAX_MESSAGE = 2000;
const MIN_MESSAGE = 10;
const MAX_PER_HOUR = 3; // per visitor
const WINDOW_MS = 60 * 60 * 1000;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

export async function POST(req: NextRequest) {
  const done = () => new Response(null, { status: 204 });

  // Only our own contact form posts here: another website must not be able to send messages through a visitor's browser.
  if (crossSite(req)) return new Response(null, { status: 403 });

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return done();

  if (rateLimited(`contact:${clientIp(req)}`, MAX_PER_HOUR, WINDOW_MS)) return new Response(null, { status: 429 });

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
  const { name, email, message, hp } = body as Record<string, unknown>;

  // Hidden field that real visitors never fill in. Bots that do get a normal-looking success.
  if (typeof hp === "string" && hp.length > 0) return done();

  const cleanName = cleanText(name, MAX_NAME);
  const cleanEmail = cleanText(email, MAX_EMAIL);
  const cleanMessage = cleanText(message, MAX_MESSAGE);
  if (!EMAIL.test(cleanEmail) || cleanMessage.length < MIN_MESSAGE) return new Response(null, { status: 400 });

  // Without Telegram configured the message has nowhere to go: say so instead of pretending it was sent.
  if (!telegramEnabled()) return new Response(null, { status: 503 });

  await sendTelegram(
    [
      "✉️ <b>New contact message</b>",
      cleanName ? `👤 ${escapeHtml(cleanName)}` : null,
      `📧 ${escapeHtml(cleanEmail)}`,
      `“${escapeHtml(cleanMessage)}”`,
      visitorLine(req),
    ]
      .filter(Boolean)
      .join("\n")
  );
  return done();
}
