import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Activities | How Cooked Is Your Major?",
  description: "Daily games for students: Major Wordle and Cooked or Cap? New puzzles every day, free.",
};

const GAMES = [
  { href: "/activities/wordle", name: "Major Wordle", blurb: "One campus word a day. Six tries. Share the grid." },
  { href: "/activities/cooked-or-cap", name: "Cooked or Cap?", blurb: "Ten true-or-cap questions on degrees and jobs, new every day." },
  { href: "/activities/tic-tac-toe", name: "Tic-Tac-Toe", blurb: "Beat the AI, or challenge a friend online." },
];

export default function ActivitiesPage() {
  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-6 font-sans text-foreground sm:p-6 md:p-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-5xl font-black uppercase leading-[0.98] sm:text-6xl">
            Daily <span className="text-[#FF6A00]">games.</span>
          </h1>
          <p className="mt-3 text-muted-foreground">Free, new every day at midnight UTC. Come back tomorrow.</p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2">
          {GAMES.map((g) => (
            <li key={g.href}>
              <Link
                href={g.href}
                className="group flex h-full flex-col justify-between gap-6 rounded-3xl border border-foreground/15 bg-card p-6 transition hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
              >
                <div>
                  <h2 className="text-2xl font-black uppercase leading-[0.98]">{g.name}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{g.blurb}</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-semibold">
                  Play <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/activities/leaderboard" className="inline-block text-sm font-semibold underline underline-offset-4">
          Today&apos;s leaderboards
        </Link>
        <p className="text-xs text-muted-foreground">Entertainment, not career advice.</p>
      </div>
    </main>
  );
}
