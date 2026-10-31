// SERVER ONLY. A tally of finished daily games (SQL in db/game_plays.sql), read by the owner's Telegram digest.
// Nothing about the person is stored: the game, the UTC puzzle day and the short result code.

import { storeEnabled } from "@/lib/payments/store";

export const playsEnabled = storeEnabled;

export const PLAY_GAMES = ["wordle", "cooked-or-cap", "major-wars", "tic-tac-toe"] as const;
export type PlayGame = (typeof PLAY_GAMES)[number];

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown[]> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const res = await fetch(`${base}/rest/v1/game_plays${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.prefer ? { Prefer: init.prefer } : {}),
    },
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`database answered ${res.status}`); // never include the body
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown[]) : [];
}

/** Never throws: a tally that cannot be written must not break the game that reported it. */
export async function recordPlay(game: string, day: number, result: string): Promise<void> {
  if (!playsEnabled() || !PLAY_GAMES.includes(game as PlayGame) || !Number.isInteger(day) || day < 1) return;
  try {
    await call("", { method: "POST", body: JSON.stringify({ game, day, result }), prefer: "return=minimal" });
  } catch {
    console.error("[games] could not record a play");
  }
}

export type PlayRow = { game: PlayGame; result: string };

/** Every finished game of a puzzle day (capped, so a flood cannot make the digest slow). */
export async function playsForDay(day: number): Promise<PlayRow[]> {
  return (await call(`?select=game,result&day=eq.${day}&limit=5000`)) as PlayRow[];
}
