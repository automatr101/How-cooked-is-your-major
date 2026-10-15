import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";
import { insertReview, ReviewStoreError, reviewsEnabled } from "@/lib/reviews/store";

// "Was your score accurate?" on the free result: a thumbs up or down for one major. It stores exactly that and nothing
// else: no name, no country, no text, no IP. A thumb carries nothing that could be shown by itself, so it counts straight
// away (it can still be hidden in the admin view). The count is only ever shown as a real number of real votes.

const MAX_BODY_BYTES = 512;
const MAX_PER_HOUR = 12; // per visitor, across majors
const WINDOW_MS = 60 * 60 * 1000;

const status = (code: number) => new Response(null, { status: code, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (crossSite(req)) return status(403);
  if (!reviewsEnabled()) return status(503);

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return status(204);
  if (rateLimited(`feedback:${clientIp(req)}`, MAX_PER_HOUR, WINDOW_MS)) return status(429);

  let body: Record<string, unknown>;
  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return status(413);
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return status(413);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return status(400);
    body = parsed as Record<string, unknown>;
  } catch {
    return status(400);
  }

  // Hidden field real visitors never fill in: bots that do get a normal-looking success
  if (typeof body.hp === "string" && body.hp.length > 0) return status(204);

  const major = findMajor(body.major);
  if (!major || typeof body.accurate !== "boolean") return status(400);

  try {
    await insertReview({
      kind: "free_feedback",
      major_slug: major.slug,
      accurate: body.accurate,
      rating: null,
      comment: null,
      consent_display: false,
      display_name: null,
      country: null,
      purchase_reference: null,
      status: "approved",
    });
  } catch (err) {
    console.error("[reviews] could not save a thumb", err instanceof ReviewStoreError ? err.message : "error");
    return status(502);
  }
  return status(204);
}
