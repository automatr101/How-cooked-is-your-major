"use client";

import Link from "next/link";
import { ArrowRight, Check, Flame } from "lucide-react";
import { useTodayStatus } from "@/lib/games/status";
import { track } from "@/lib/analytics";

// "Play today's games": a slim strip for the home page and under a scan result. Shows what is still to play today.

const GAMES = [
  { key: "wordle", href: "/activities/wordle", name: "Major Wordle" },
  { key: "cooked-or-cap", href: "/activities/cooked-or-cap", name: "Cooked or Cap?" },
] as const;

export function GamesStrip({ where, className = "" }: { where: "home" | "result"; className?: string }) {
  const status = useTodayStatus();
  const left = GAMES.filter((g) => !status[g.key].done).length;
  return (
    <section aria-label="Daily games" className={`mx-auto w-full max-w-xl rounded-3xl border border-border bg-card/60 p-5 text-left ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-black uppercase tracking-widest">Daily games</h2>
        <Link href="/activities" onClick={() => track("games_promo_click", { where, target: "hub" })} className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-4">
          All games <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{left === 0 ? "All done today. New puzzles at midnight UTC." : "Free. New puzzles every day."}</p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {GAMES.map((g) => {
          const s = status[g.key];
          return (
            <li key={g.key}>
              <Link
                href={g.href}
                onClick={() => track("games_promo_click", { where, target: g.key })}
                className="flex h-12 items-center justify-between rounded-2xl border border-border px-4 text-sm font-semibold transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
              >
                {g.name}
                {s.done ? (
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Check className="h-3 w-3" /> Done
                  </span>
                ) : s.streak > 0 ? (
                  <span className="inline-flex items-center gap-1 text-xs text-[#FF6A00]">
                    <Flame className="h-3 w-3" /> {s.streak} day streak
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">Play</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
