import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { mayRead } from "@/lib/payments/access";
import { entitlementReference } from "@/lib/payments/entitlement";
import { cleanText } from "@/lib/clean-text";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled } from "@/lib/telegram";
import { insertReview, ReviewStoreError, reviewsEnabled } from "@/lib/reviews/store";

// A buyer's review of their plan: 1 to 5 stars, an optional line, and (only if they tick the box) permission to show
// their first name or initial, their major and their country. It is a VERIFIED review because the server checks the
// signed unlock cookie for that major (and that the payment was not refunded), takes the payment reference from it,
// and allows one review per payment. The browser cannot claim to be a buyer: nothing here trusts what it says about that.
// A new review waits as "pending" until the owner approves it in /admin/reviews.

const MAX_BODY_BYTES = 2048;
const MAX_COMMENT = 300;
const MAX_NAME = 24;
const MAX_PER_HOUR = 6;
const WINDOW_MS = 60 * 60 * 1000;

const reply = (code: number, body?: unknown) =>
  body === undefined
    ? new Response(null, { status: code, headers: { "Cache-Control": "no-store" } })
    : Response.json(body, { status: code, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply(403);
  if (!reviewsEnabled()) return reply(503, { error: "not_available" });

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply(204);
  if (rateLimited(`rating:${clientIp(req)}`, MAX_PER_HOUR, WINDOW_MS)) return reply(429, { error: "too_many_requests" });

  let body: Record<string, unknown>;
  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return reply(413);
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return reply(413);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply(400);
    body = parsed as Record<string, unknown>;
  } catch {
    return reply(400);
  }
  if (typeof body.hp === "string" && body.hp.length > 0) return reply(204);

  const major = findMajor(body.major);
  const rating = body.rating;
  if (!major || typeof rating !== "number" || !Number.isInteger(rating) || rating < 1 || rating > 5) return reply(400, { error: "bad_request" });

  // The proof that this browser really bought this major's plan
  if (!(await mayRead(req, major.slug))) return reply(402, { error: "payment_required" });
  const reference = entitlementReference(req, major.slug);
  if (!reference) return reply(402, { error: "payment_required" });

  const comment = cleanText(body.comment, MAX_COMMENT);
  const consent = body.consent === true;
  // Name and country are kept ONLY with consent. The country is the one Vercel saw for this request, never a typed value.
  const name = consent ? cleanText(body.name, MAX_NAME) : "";
  const country = consent ? (req.headers.get("x-vercel-ip-country") ?? "").toUpperCase() : "";
  if (consent && !name) return reply(400, { error: "name_required" });

  try {
    await insertReview({
      kind: "verified_purchase",
      major_slug: major.slug,
      accurate: null,
      rating,
      comment: comment || null,
      consent_display: consent,
      display_name: name || null,
      country: /^[A-Z]{2}$/.test(country) ? country : null,
      purchase_reference: reference,
      status: "pending",
    });
  } catch (err) {
    if (err instanceof ReviewStoreError && err.message === "duplicate") return reply(409, { error: "already_reviewed" });
    console.error("[reviews] could not save a verified review");
    return reply(502, { error: "could_not_save" });
  }

  if (telegramEnabled()) {
    await sendTelegram(
      [
        `${"⭐".repeat(rating)}${"☆".repeat(5 - rating)} <b>New verified review</b> (${rating}/5), waiting for approval`,
        comment ? `“${escapeHtml(comment)}”` : null,
        `📚 ${escapeHtml(major.name)} (${major.score}%)`,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  return reply(204);
}
