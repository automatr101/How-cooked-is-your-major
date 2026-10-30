import { NextRequest } from "next/server";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";
import { currentDay } from "@/lib/games/scores";
import { insertVote, split, VoteStoreError, votesEnabled } from "@/lib/games/votes";

// Major Wars. POST = cast today's vote (one per player per day, today only). GET = the crowd's split for today or any
// earlier day. Both answer with percentages only, and only once enough people have voted. Nothing is trusted but the
// shape of the request; a vote is a vote, so the only protection is a limit per IP and one row per browser id per day.

const MAX_BODY_BYTES = 512;
const PLAYER_ID = /^[A-Za-z0-9-]{16,64}$/;

const reply = (code: number, body?: unknown) =>
  body === undefined
    ? new Response(null, { status: code, headers: { "Cache-Control": "no-store" } })
    : Response.json(body, { status: code, headers: { "Cache-Control": "no-store" } });

function guard(req: NextRequest, bucket: string, max: number): Response | null {
  if (!votesEnabled()) return reply(503, { error: "not_available" });
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply(204);
  if (rateLimited(`vote-${bucket}:${clientIp(req)}`, max, 60 * 60 * 1000)) return reply(429, { error: "too_many_requests" });
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = guard(req, "read", 120);
  if (blocked) return blocked;
  const day = Number(req.nextUrl.searchParams.get("day"));
  if (!Number.isInteger(day) || day < 1 || day > currentDay()) return reply(400, { error: "bad_request" });
  try {
    return reply(200, { day, pct: await split(day) });
  } catch {
    return reply(503, { error: "not_available" });
  }
}

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply(403);
  const blocked = guard(req, "cast", 30);
  if (blocked) return blocked;

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

  const { day, choice, playerId } = body;
  if (typeof playerId !== "string" || !PLAYER_ID.test(playerId) || (choice !== 0 && choice !== 1)) return reply(400, { error: "bad_request" });
  if (typeof day !== "number" || day !== currentDay()) return reply(400, { error: "wrong_day" });

  try {
    await insertVote({ day, player_id: playerId, choice });
  } catch (e) {
    // A second vote from the same browser is not an error: they just get the split back
    if (!(e instanceof VoteStoreError && e.message === "duplicate")) {
      console.error("[games] could not save a vote");
      return reply(503, { error: "not_available" });
    }
  }
  try {
    return reply(200, { day, pct: await split(day) });
  } catch {
    return reply(200, { day, pct: null });
  }
}
