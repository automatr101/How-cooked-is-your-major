// Shared bits for the daily games: today's puzzle number, a seeded random generator, saved progress and streaks.
// Everyone gets the same puzzle on the same UTC day (UTC is Ghana time), so results are comparable when shared.

const EPOCH_MS = Date.UTC(2026, 9, 30); // puzzle #1 = 30 October 2026

export function dayNumber(now: Date = new Date()): number {
  return Math.max(1, Math.floor((now.getTime() - EPOCH_MS) / 86400000) + 1);
}

/** The UTC date a puzzle number belongs to, as a Date at 00:00 UTC. */
export const dayStart = (day: number): Date => new Date(EPOCH_MS + (day - 1) * 86400000);

/** Small deterministic random generator (mulberry32): same seed, same sequence. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(items: readonly T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export type Stats = { played: number; won: number; streak: number; best: number; lastDay: number };
export const EMPTY_STATS: Stats = { played: 0, won: 0, streak: 0, best: 0, lastDay: 0 };

// localStorage can be missing or throw (private windows); every read and write is wrapped and the games work without it.
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

/** Stats after finishing today's puzzle. The streak counts consecutive days played AND won. */
export function recordResult(prev: Stats, day: number, won: boolean): Stats {
  const streak = won ? (prev.lastDay === day - 1 && prev.streak > 0 ? prev.streak + 1 : 1) : 0;
  return {
    played: prev.played + 1,
    won: prev.won + (won ? 1 : 0),
    streak,
    best: Math.max(prev.best, streak),
    lastDay: day,
  };
}
