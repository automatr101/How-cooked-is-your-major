"use client";

import Link from "next/link";
import { ArrowRight, Check, Flame } from "lucide-react";
import { useTodayStatus, type TodayStatus } from "@/lib/games/status";

const GAMES: { href: string; name: string; blurb: string; daily?: keyof TodayStatus }[] = [
  { href: "/activities/wordle", name: "Major Wordle", blurb: "One campus word a day. Six tries. Share the grid.", daily: "wordle" },
  { href: "/activities/cooked-or-cap", name: "Cooked or Cap?", blurb: "Ten true-or-cap questions on degrees and jobs, new every day.", daily: "cooked-or-cap" },
  { href: "/activities/major-wars", name: "Major Wars", blurb: "Two degrees, one vote a day: which is more cooked? See the scan and the crowd.", daily: "major-wars" },
  { href: "/activities/tic-tac-toe", name: "Tic-Tac-Toe", blurb: "Beat the AI, or challenge a friend online." },
];

export function HubCards() {
  const status = useTodayStatus();
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {GAMES.map((g) => {
        const s = g.daily ? status[g.daily] : null;
        return (
          <li key={g.href}>
            <Link
              href={g.href}
              className="group flex h-full flex-col justify-between gap-6 rounded-3xl border border-foreground/15 bg-card p-6 transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-2xl font-black uppercase leading-[0.98]">{g.name}</h2>
                  {s?.done ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground/10 px-3 py-1 text-xs font-semibold">
                      <Check className="h-3 w-3" /> Done today
                    </span>
                  ) : s && s.streak > 0 ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#FF6A00] px-3 py-1 text-xs font-semibold text-[#0C0C0C]">
                      <Flame className="h-3 w-3" /> {s.streak} day streak
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
              </div>
              <span className="inline-flex items-center gap-2 text-sm font-semibold">
                {s?.done ? "See your result" : "Play"} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
