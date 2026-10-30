import { NextRequest } from "next/server";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";
import { board, cleanNickname, currentDay, GAMES, insertScore, ScoreStoreError, scoresEnabled, verifiedScore, type Game } from "@/lib/games/scores";

// Puts a finished daily game on the leaderboard. The browser sends WHAT IT PLAYED (guesses, answers), never a score: the
// server works the score out itself, only for today's puzzle, one entry per player per game per day. Nothing is trusted but
// the answers, and a score is only as cheat-proof as a daily puzzle whose rules are public can be.

const MAX_BODY_BYTES = 2048;
const MAX_PER_HOUR = 10; // per IP, so one shared school network still works but a script does not
const WINDOW_MS = 60 * 60 * 1000;
const PLAYER_ID = /^[A-Za-z0-9-]{16,64}$/;

const reply = (code: number, body?: unknown) =>
  body === undefined
    ? new Response(null, { status: code, headers: { "Cache-Control": "no-store" } })
    : Response.json(body, { status: code, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply(403);
  if (!scoresEnabled()) return reply(503, { error: "not_available" });

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply(204);
  if (rateLimited(`score:${clientIp(req)}`, MAX_PER_HOUR, WINDOW_MS)) return reply(429, { error: "too_many_requests" });

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

  const game = body.game as Game;
  const day = body.day;
  const playerId = body.playerId;
  if (!GAMES.includes(game) || typeof playerId !== "string" || !PLAYER_ID.test(playerId)) return reply(400, { error: "bad_request" });
  // Only today's puzzle can be posted (UTC day, the same one the games use)
  if (typeof day !== "number" || day !== currentDay()) return reply(400, { error: "wrong_day" });

  const nickname = cleanNickname(body.nickname);
  if (!nickname) return reply(400, { error: "bad_nickname" });

  const score = verifiedScore(game, day, body.answers);
  if (score === null) return reply(400, { error: "bad_game" });

  try {
    await insertScore({ game, day, player_id: playerId, nickname, score });
  } catch (e) {
    if (e instanceof ScoreStoreError && e.message === "duplicate") return reply(409, { error: "already_posted" });
    console.error("[games] could not save a score");
    return reply(503, { error: "not_available" });
  }
  try {
    return reply(200, await board(game, day, playerId));
  } catch {
    return reply(200, { day, game, total: 0, top: [], you: null });
  }
}
