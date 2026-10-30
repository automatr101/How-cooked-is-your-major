// SERVER ONLY. Daily game leaderboards: the Supabase table (SQL in db/game_scores.sql), score checking and nickname rules.
// Same access model as reviews: the secret service key, a table with Row Level Security on and no public policies.

import { storeEnabled } from "@/lib/payments/store";
import { WORDLE_ANSWERS } from "@/content/games";
import { buildQuiz } from "./cooked-or-cap";
import { dayNumber } from "./daily";

export type Game = "wordle" | "cooked-or-cap";
export const GAMES: readonly Game[] = ["wordle", "cooked-or-cap"];
export const scoresEnabled = storeEnabled;
/** Wordle: fewer guesses is better. Cooked or Cap?: more correct answers is better. */
export const lowerIsBetter = (g: Game) => g === "wordle";

export class ScoreStoreError extends Error {}

// ---- checking a score ------------------------------------------------------------------------------------------------

/**
 * The score the browser's answers really earn for this game and day, or null if they are not a valid finished game.
 * The browser never sends a score, only what it played: guesses for Wordle (must end on today's word), answers for the quiz.
 */
export function verifiedScore(game: Game, day: number, payload: unknown): number | null {
  if (game === "wordle") {
    if (!Array.isArray(payload) || payload.length < 1 || payload.length > 6) return null;
    const answer = WORDLE_ANSWERS[(day - 1) % WORDLE_ANSWERS.length];
    const guesses = payload.map((g) => (typeof g === "string" ? g : ""));
    if (!guesses.every((g) => /^[A-Z]{5}$/.test(g))) return null;
    // solved on the LAST guess and not before (a game ends the moment it is solved)
    if (guesses.at(-1) !== answer || guesses.slice(0, -1).includes(answer)) return null;
    return guesses.length;
  }
  const quiz = buildQuiz(day);
  if (!Array.isArray(payload) || payload.length !== quiz.length) return null;
  if (!payload.every((a, i) => Number.isInteger(a) && a >= 0 && a < quiz[i].options.length)) return null;
  return payload.filter((a, i) => a === quiz[i].correct).length;
}

export const currentDay = () => dayNumber();

// ---- nicknames ---------------------------------------------------------------------------------------------------------

// Letters, digits, spaces and . _ - only; 2 to 16 characters. The rude-word check ignores case, spacing, punctuation and
// common number-for-letter swaps, so "f.u.c.k" and "sh1t" are caught. It will sometimes refuse an innocent name: the person is asked to pick another.
const RUDE = [
  "fuck", "shit", "bitch", "cunt", "dick", "cock", "pussy", "penis", "vagina", "nigg", "fagg", "whore", "slut", "rape", "nazi",
  "hitler", "kkk", "porn", "asshole", "bastard", "twat", "wank", "tits", "boob", "sex", "anal", "dildo", "cum", "retard", "paedo", "pedo",
];

export function cleanNickname(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!/^[A-Za-z0-9 ._-]{2,16}$/.test(name)) return null;
  const flat = name.toLowerCase().replace(/[01345$@!]/g, (c) => ({ "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", $: "s", "@": "a", "!": "i" })[c] as string).replace(/[^a-z]/g, "");
  if (RUDE.some((w) => flat.includes(w))) return null;
  return name;
}

// ---- the table -----------------------------------------------------------------------------------------------------------

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<{ rows: unknown[]; total: number | null }> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/game_scores${path}`, {
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
    throw new ScoreStoreError("database unreachable");
  }
  if (res.status === 409) throw new ScoreStoreError("duplicate");
  if (!res.ok) throw new ScoreStoreError(`database answered ${res.status}`); // never include the body: it may echo values
  const text = await res.text();
  const range = res.headers.get("content-range"); // "0-9/42"
  const total = range && /\/(\d+)$/.test(range) ? Number(range.split("/")[1]) : null;
  return { rows: text ? (JSON.parse(text) as unknown[]) : [], total };
}

export async function insertScore(row: { game: Game; day: number; player_id: string; nickname: string; score: number }): Promise<void> {
  await call("", { method: "POST", body: JSON.stringify(row), prefer: "return=minimal" });
}

export interface BoardEntry {
  rank: number;
  nickname: string;
  score: number;
}

export interface Board {
  day: number;
  game: Game;
  total: number;
  top: BoardEntry[];
  you: BoardEntry | null; // only when the caller's player id is on the board (looked up within the top 100)
}

/** Today's (or any day's) board: the top 10 and, for the asking player, their own place within the top 100. */
export async function board(game: Game, day: number, playerId: string | null): Promise<Board> {
  const order = lowerIsBetter(game) ? "score.asc,created_at.asc" : "score.desc,created_at.asc";
  const { rows, total } = await call(
    `?select=player_id,nickname,score&game=eq.${game}&day=eq.${day}&order=${order}&limit=100`,
    { prefer: "count=exact" }
  );
  const all = (rows as { player_id: string; nickname: string; score: number }[]).map((r, i) => ({ player_id: r.player_id, rank: i + 1, nickname: r.nickname, score: r.score }));
  const mine = playerId ? all.find((r) => r.player_id === playerId) : undefined;
  const strip = ({ rank, nickname, score }: (typeof all)[number]): BoardEntry => ({ rank, nickname, score });
  return { day, game, total: total ?? all.length, top: all.slice(0, 10).map(strip), you: mine ? strip(mine) : null };
}
