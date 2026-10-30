// SERVER ONLY. Online Tic-Tac-Toe rooms (SQL in db/ttt_rooms.sql). The server is the referee: a move is only applied if it is
// that seat's turn, the square is free and the game is still on. Each seat has a secret token that stays in that browser.

import { randomBytes } from "node:crypto";
import { storeEnabled } from "@/lib/payments/store";
import { isFull, winner, type Board, type Cell } from "./tictactoe";

export const roomsEnabled = storeEnabled;
export class RoomStoreError extends Error {}

export type Seat = "X" | "O";
export interface RoomRow {
  code: string;
  board: string;
  turn: Seat;
  status: "waiting" | "playing" | "won" | "draw";
  winner: Seat | null;
  round: number;
  x_token: string;
  o_token: string | null;
}

/** What a player is told: the room as they see it. Never any token. */
export interface RoomView {
  code: string;
  seat: Seat;
  board: Cell[];
  turn: Seat;
  status: RoomRow["status"];
  winner: Seat | null;
  line: number[] | null;
  round: number;
}

export const CODE = /^[A-Z0-9]{5}$/;
export const TOKEN = /^[a-f0-9]{32}$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1: easy to read out loud

const newCode = () => [...randomBytes(5)].map((b) => ALPHABET[b % ALPHABET.length]).join("");
const newToken = () => randomBytes(16).toString("hex");

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown[]> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/ttt_rooms${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    throw new RoomStoreError("database unreachable");
  }
  if (res.status === 409) throw new RoomStoreError("duplicate");
  if (!res.ok) throw new RoomStoreError(`database answered ${res.status}`); // never include the body
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown[]) : [];
}

const eq = (v: string | number) => `eq.${encodeURIComponent(String(v))}`;

const toBoard = (s: string): Board => [...s].map((c) => (c === "X" || c === "O" ? c : null));
const fromBoard = (b: Board): string => b.map((c) => c ?? "-").join("");

export function view(room: RoomRow, seat: Seat): RoomView {
  const board = toBoard(room.board);
  return { code: room.code, seat, board, turn: room.turn, status: room.status, winner: room.winner, line: winner(board)?.line ?? null, round: room.round };
}

/** Which seat this token holds in the room, or null. */
export function seatOf(room: RoomRow, token: string): Seat | null {
  if (room.x_token === token) return "X";
  if (room.o_token && room.o_token === token) return "O";
  return null;
}

export async function getRoom(code: string): Promise<RoomRow | null> {
  const rows = (await call(`?select=*&code=${eq(code)}&limit=1`)) as RoomRow[];
  return rows[0] ?? null;
}

/** A new room; the creator is X. Also sweeps rooms nobody has touched for a day. */
export async function createRoom(): Promise<{ code: string; token: string }> {
  call(`?updated_at=lt.${encodeURIComponent(new Date(Date.now() - 86400000).toISOString())}`, { method: "DELETE" }).catch(() => {});
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const token = newToken();
    try {
      await call("", { method: "POST", body: JSON.stringify({ code, x_token: token }), prefer: "return=minimal" });
      return { code, token };
    } catch (e) {
      if (!(e instanceof RoomStoreError && e.message === "duplicate")) throw e; // a code clash: try another
    }
  }
  throw new RoomStoreError("no free code");
}

/** Takes the O seat. Null if the room is missing or already full. */
export async function joinRoom(code: string): Promise<{ token: string } | null> {
  const token = newToken();
  // Only succeeds while the seat is still empty, so two people opening the link cannot both get it
  const rows = await call(`?code=${eq(code)}&o_token=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ o_token: token, status: "playing", updated_at: new Date().toISOString() }),
    prefer: "return=representation",
  });
  return rows.length ? { token } : null;
}

export type MoveResult = { ok: true; room: RoomRow } | { ok: false; reason: "not_your_turn" | "bad_move" | "over" | "conflict" };

export async function move(room: RoomRow, seat: Seat, cell: number): Promise<MoveResult> {
  if (room.status === "won" || room.status === "draw") return { ok: false, reason: "over" };
  if (room.status !== "playing" || room.turn !== seat) return { ok: false, reason: "not_your_turn" };
  const board = toBoard(room.board);
  if (!Number.isInteger(cell) || cell < 0 || cell > 8 || board[cell]) return { ok: false, reason: "bad_move" };
  board[cell] = seat;
  const w = winner(board);
  const patch = {
    board: fromBoard(board),
    turn: seat === "X" ? "O" : "X",
    status: w ? "won" : isFull(board) ? "draw" : "playing",
    winner: w ? w.who : null,
    updated_at: new Date().toISOString(),
  };
  // Applied only if the room is exactly as we read it, so two quick taps cannot both land
  const rows = (await call(`?code=${eq(room.code)}&board=${eq(room.board)}&turn=${eq(room.turn)}&status=eq.playing`, {
    method: "PATCH",
    body: JSON.stringify(patch),
    prefer: "return=representation",
  })) as RoomRow[];
  return rows.length ? { ok: true, room: rows[0] } : { ok: false, reason: "conflict" };
}

/** Starts the next round (alternating who opens), but only once the game is over. */
export async function rematch(room: RoomRow): Promise<RoomRow | null> {
  if (room.status !== "won" && room.status !== "draw") return null;
  const round = room.round + 1;
  const rows = (await call(`?code=${eq(room.code)}&round=${eq(room.round)}&status=in.(won,draw)`, {
    method: "PATCH",
    body: JSON.stringify({ board: "---------", turn: round % 2 === 0 ? "X" : "O", status: "playing", winner: null, round, updated_at: new Date().toISOString() }),
    prefer: "return=representation",
  })) as RoomRow[];
  return rows[0] ?? null;
}
