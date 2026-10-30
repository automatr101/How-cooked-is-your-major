import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LeaderboardPanel } from "@/components/games/leaderboard-panel";
import { currentDay } from "@/lib/games/scores";

export const metadata: Metadata = {
  title: "Daily leaderboards | How Cooked Is Your Major?",
  description: "Today's top scores in Major Wordle and Cooked or Cap?. Resets every day.",
};

// The day is read when the page is requested, so a stale build never shows yesterday's number
export const dynamic = "force-dynamic";

export default function Page() {
  const day = currentDay();
  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-6 font-sans text-foreground sm:p-6 md:p-12">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Activities
        </Link>
        <header>
          <h1 className="text-4xl font-black uppercase leading-[0.98]">
            Daily <span className="text-[#FF6A00]">boards.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Day #{day}. Play a game, then post your result under a nickname. Resets at midnight UTC.</p>
        </header>
        <div className="grid gap-4 sm:grid-cols-2">
          <LeaderboardPanel game="wordle" day={day} title="Major Wordle" />
          <LeaderboardPanel game="cooked-or-cap" day={day} title="Cooked or Cap?" />
        </div>
        <p className="text-xs text-muted-foreground">Entertainment, not career advice.</p>
      </div>
    </main>
  );
}
