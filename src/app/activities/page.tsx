import type { Metadata } from "next";
import Link from "next/link";
import { HubCards } from "./hub-cards";

export const metadata: Metadata = {
  title: "Activities | How Cooked Is Your Major?",
  description: "Daily games for students: Major Wordle, Cooked or Cap? and Major Wars. New puzzles every day, free.",
};

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
        <HubCards />
        <Link href="/activities/leaderboard" className="inline-block text-sm font-semibold underline underline-offset-4">
          Today&apos;s leaderboards
        </Link>
        <p className="text-xs text-muted-foreground">Entertainment, not career advice.</p>
      </div>
    </main>
  );
}
