import { NextRequest } from "next/server";
import { majors } from "@/lib/data";
import { cleanText } from "@/lib/clean-text";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { slugify } from "@/lib/analytics";
import { insertReview, reviewsEnabled } from "@/lib/reviews/store";

// Star ratings from the site's rating popup. They are delivered to the Telegram bot AND, when the database is set up,
// stored in the reviews table as "free scan feedback" (waiting for approval; never quoted on the site, because the
// popup does not ask permission to show anyone's words, so they only count towards the totals once approved).
// Silently does nothing until TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set, or the database is.

const MAX_BODY_BYTES = 4096;
const MAX_COMMENT_CHARS = 500;
const MAX_PER_HOUR = 3; // per visitor
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(req: NextRequest) {
  const done = () => new Response(null, { status: 204 });

  // Only our own review box posts here: another website must not be able to send reviews through a visitor's browser.
  if (crossSite(req)) return new Response(null, { status: 403 });

  if (!telegramEnabled() && !reviewsEnabled()) return done();

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

  // Stored first and never allowed to fail the visitor's request: a database problem must not lose the Telegram alert
  if (reviewsEnabled()) {
    try {
      await insertReview({
        kind: "free_feedback",
        major_slug: found ? slugify(found.name) : null,
        accurate: null,
        rating,
        comment: text ? text.slice(0, 300) : null,
        consent_display: false,
        display_name: null,
        country: null,
        purchase_reference: null,
        status: "pending",
      });
    } catch {
      console.error("[review] could not save a rating");
    }
  }
  if (telegramEnabled()) await sendTelegram(message);
  return done();
}
