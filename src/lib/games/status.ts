"use client";

import { useEffect, useState } from "react";
import { WORDLE_ANSWERS } from "@/content/games";
import { dayNumber, load, type Stats } from "./daily";

// Where this browser is with today's daily games, read from what the games saved (localStorage). Nothing is sent anywhere.

export type GameStatus = { done: boolean; streak: number };
export type TodayStatus = { wordle: GameStatus; "cooked-or-cap": GameStatus };
const NONE: TodayStatus = { wordle: { done: false, streak: 0 }, "cooked-or-cap": { done: false, streak: 0 } };

// A streak only counts if it is still alive: played today or yesterday
const liveStreak = (s: Stats | undefined, day: number) => (s && s.lastDay >= day - 1 ? s.streak : 0);

export function readTodayStatus(): TodayStatus {
  const day = dayNumber();
  const w = load<{ day: number; guesses: string[]; stats?: Stats }>("cm_wordle_v1", { day: 0, guesses: [] });
  const q = load<{ day: number; answers: number[]; stats?: Stats }>("cm_cooked_or_cap_v1", { day: 0, answers: [] });
  const answer = WORDLE_ANSWERS[(day - 1) % WORDLE_ANSWERS.length];
  return {
    wordle: { done: w.day === day && (w.guesses.at(-1) === answer || w.guesses.length >= 6), streak: liveStreak(w.stats, day) },
    "cooked-or-cap": { done: q.day === day && q.answers.length >= 10, streak: liveStreak(q.stats, day) },
  };
}

/** Today's status per game. Starts as "nothing played" (what the server renders) and fills in after mount. */
export function useTodayStatus(): TodayStatus {
  const [status, setStatus] = useState<TodayStatus>(NONE);
  useEffect(() => {
    // Reading saved games is browser-only, so it has to happen after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(readTodayStatus());
  }, []);
  return status;
}
