import { NextRequest } from "next/server";
import { board, currentDay, GAMES, scoresEnabled, type Game } from "@/lib/games/scores";

// Read-only: today's top 10 for a game (and the asking player's own place when ?pid= is a player id on the board).
// It only ever returns nicknames and scores, never player ids.

const empty = (game: Game, day: number) => ({ day, game, total: 0, top: [], you: null });

export async function GET(req: NextRequest) {
  const game = req.nextUrl.searchParams.get("game") as Game;
  if (!GAMES.includes(game)) return Response.json({ error: "bad_request" }, { status: 400 });
  const day = currentDay();
  const pid = req.nextUrl.searchParams.get("pid");
  const playerId = pid && /^[A-Za-z0-9-]{16,64}$/.test(pid) ? pid : null;
  const headers = { "Cache-Control": playerId ? "no-store" : "public, s-maxage=20, stale-while-revalidate=60" };
  if (!scoresEnabled()) return Response.json(empty(game, day), { headers });
  try {
    return Response.json(await board(game, day, playerId), { headers });
  } catch {
    return Response.json(empty(game, day), { headers });
  }
}
