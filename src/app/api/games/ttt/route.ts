import { NextRequest } from "next/server";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";
import { CODE, TOKEN, createRoom, getRoom, joinRoom, move, rematch, RoomStoreError, roomsEnabled, seatOf, view } from "@/lib/games/ttt-rooms";

// Online Tic-Tac-Toe. GET = the room as one of its two players sees it (polled every second or two while a game is open).
// POST = create | join | move | rematch. The server is the referee (see lib/games/ttt-rooms.ts); a player is whoever holds
// the secret token for a seat, and the token is never sent to the other player.

const MAX_BODY_BYTES = 512;
const reply = (code: number, body?: unknown) =>
  body === undefined
    ? new Response(null, { status: code, headers: { "Cache-Control": "no-store" } })
    : Response.json(body, { status: code, headers: { "Cache-Control": "no-store" } });

function guard(req: NextRequest, bucket: string, max: number, windowMs: number): Response | null {
  if (!roomsEnabled()) return reply(503, { error: "not_available" });
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply(204);
  if (rateLimited(`ttt-${bucket}:${clientIp(req)}`, max, windowMs)) return reply(429, { error: "too_many_requests" });
  return null;
}

export async function GET(req: NextRequest) {
  const blocked = guard(req, "state", 240, 60_000);
  if (blocked) return blocked;
  const code = (req.nextUrl.searchParams.get("code") ?? "").toUpperCase();
  const token = req.nextUrl.searchParams.get("token") ?? "";
  if (!CODE.test(code) || !TOKEN.test(token)) return reply(400, { error: "bad_request" });
  try {
    const room = await getRoom(code);
    const seat = room ? seatOf(room, token) : null;
    if (!room || !seat) return reply(404, { error: "no_such_game" });
    return reply(200, view(room, seat));
  } catch {
    return reply(503, { error: "not_available" });
  }
}

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply(403);

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
  const action = body.action;
  const code = typeof body.code === "string" ? body.code.toUpperCase() : "";
  const token = typeof body.token === "string" ? body.token : "";

  try {
    if (action === "create") {
      const blocked = guard(req, "create", 10, 60 * 60 * 1000);
      if (blocked) return blocked;
      const room = await createRoom();
      return reply(200, { code: room.code, token: room.token, seat: "X" });
    }

    if (action === "join") {
      const blocked = guard(req, "join", 30, 60 * 60 * 1000);
      if (blocked) return blocked;
      if (!CODE.test(code)) return reply(400, { error: "bad_request" });
      const existing = await getRoom(code);
      if (!existing) return reply(404, { error: "no_such_game" });
      const joined = await joinRoom(code);
      if (!joined) return reply(409, { error: "game_full" });
      return reply(200, { code, token: joined.token, seat: "O" });
    }

    if (action === "move" || action === "rematch") {
      const blocked = guard(req, "move", 120, 60_000);
      if (blocked) return blocked;
      if (!CODE.test(code) || !TOKEN.test(token)) return reply(400, { error: "bad_request" });
      const room = await getRoom(code);
      const seat = room ? seatOf(room, token) : null;
      if (!room || !seat) return reply(404, { error: "no_such_game" });

      if (action === "rematch") {
        const next = await rematch(room);
        return next ? reply(200, view(next, seat)) : reply(409, { error: "game_not_over" });
      }
      const cell = body.cell;
      if (typeof cell !== "number") return reply(400, { error: "bad_request" });
      const result = await move(room, seat, cell);
      if (!result.ok) return reply(409, { error: result.reason });
      return reply(200, view(result.room, seat));
    }

    return reply(400, { error: "bad_request" });
  } catch (e) {
    if (e instanceof RoomStoreError) console.error("[ttt] database problem");
    return reply(503, { error: "not_available" });
  }
}
