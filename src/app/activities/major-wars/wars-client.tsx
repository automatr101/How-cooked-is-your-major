"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { dayNumber, EMPTY_STATS, load, recordResult, save, type Stats } from "@/lib/games/daily";
import { matchup, scanPick } from "@/lib/games/major-wars";
import { track } from "@/lib/analytics";
import { notifyGame } from "@/lib/notify";
import { GameCard } from "@/components/games/game-card";
import { ShareActions } from "@/components/games/share-actions";

const KEY = "cm_major_wars_v1";
const PID_KEY = "cm_pid";
type Saved = { day: number; choice: 0 | 1 | null; stats: Stats };
type Pct = [number, number] | null;

function playerId(): string | null {
  try {
    let id = localStorage.getItem(PID_KEY);
    if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
      id = crypto.randomUUID();
      localStorage.setItem(PID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

async function fetchSplit(day: number): Promise<Pct> {
  try {
    const res = await fetch(`/api/games/vote?day=${day}`, { cache: "no-store" });
    if (!res.ok) return null;
    return ((await res.json()) as { pct: Pct }).pct;
  } catch {
    return null;
  }
}

export function WarsClient() {
  const [day, setDay] = useState(0);
  const [choice, setChoice] = useState<0 | 1 | null>(null);
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [pct, setPct] = useState<Pct>(null);
  const [yesterday, setYesterday] = useState<Pct>(null);
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = dayNumber();
    const saved = load<Saved>(KEY, { day: 0, choice: null, stats: EMPTY_STATS });
    // Reading saved progress is browser-only, so it has to happen after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDay(d);
    setStats(saved.stats);
    if (saved.day === d && saved.choice !== null) {
      setChoice(saved.choice);
      fetchSplit(d).then(setPct);
    }
    if (d > 1) fetchSplit(d - 1).then(setYesterday);
  }, []);

  const pair = useMemo(() => (day > 0 ? matchup(day) : null), [day]);
  const yesterdayPair = useMemo(() => (day > 1 ? matchup(day - 1) : null), [day]);

  const vote = async (c: 0 | 1) => {
    if (!pair || choice !== null || busy) return;
    setBusy(true);
    track("game_start", { game: "major-wars", day });
    setChoice(c);
    const next = recordResult(stats, day, true); // the streak counts days you voted
    setStats(next);
    save(KEY, { day, choice: c, stats: next });
    track("game_complete", { game: "major-wars", day, result: c === scanPick(pair) ? "agree" : "differ" });
    notifyGame("major-wars", "vote", day);
    const id = playerId();
    if (id) {
      try {
        const res = await fetch("/api/games/vote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ day, choice: c, playerId: id }) });
        if (res.ok) setPct(((await res.json()) as { pct: Pct }).pct);
      } catch {}
    }
    setBusy(false);
  };

  const scan = pair ? scanPick(pair) : 0;
  const shareText = pair && choice !== null ? `Major Wars #${day}\nI said ${pair[choice].name} is more cooked. The scan says ${pair[scan].name}.` : "";

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-6 font-sans text-foreground sm:p-6 md:p-12">
      <div className="mx-auto max-w-md space-y-6">
        <Link href="/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Activities
        </Link>
        <header>
          <h1 className="text-4xl font-black uppercase leading-[0.98]">
            Major <span className="text-[#FF6A00]">wars.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">One vote a day. Two degrees, which one is more cooked? Scan scores, not a verdict on you. {day > 0 && `#${day}.`}</p>
        </header>

        {!pair ? (
          <div className="h-64" aria-hidden />
        ) : choice === null ? (
          <section className="space-y-4" aria-live="polite">
            <h2 className="text-xl font-bold leading-snug">Which degree is more cooked?</h2>
            <div className="grid gap-3">
              {pair.map((m, i) => (
                <button
                  key={m.name}
                  type="button"
                  disabled={busy}
                  onClick={() => vote(i as 0 | 1)}
                  className="min-h-20 rounded-2xl border-2 border-foreground/20 px-4 py-3 text-left text-2xl font-black uppercase leading-[0.98] transition enabled:hover:border-foreground/50 enabled:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
                >
                  {m.name}
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div className="space-y-5">
            <GameCard title="Major Wars" subtitle={`#${day}`} ref={cardRef}>
              <div className="w-full space-y-3 text-left">
                {pair.map((m, i) => (
                  <div key={m.name} style={{ border: `2px solid ${i === scan ? "#FF6A00" : "#303030"}`, borderRadius: 16, padding: "10px 14px" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, textTransform: "uppercase", lineHeight: 1 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: "#A6A6A6", marginTop: 4 }}>
                      Scan {m.score}
                      {i === scan ? " · more cooked" : ""}
                      {i === choice ? " · your pick" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </GameCard>

            <div className="space-y-2 rounded-2xl bg-foreground/5 p-4 text-sm">
              <p>
                {choice === scan ? "You and the scan agree." : "The scan disagrees with you."} It scores {pair[scan].name} {pair[scan].score} and {pair[1 - scan].name} {pair[1 - scan].score}.
              </p>
              {pct ? (
                <p>
                  Everyone else: {pct[0]}% said {pair[0].name}, {pct[1]}% said {pair[1].name}.
                </p>
              ) : (
                <p className="text-muted-foreground">The crowd&apos;s split shows once enough people have voted today.</p>
              )}
            </div>

            <ShareActions cardRef={cardRef} game="major-wars" day={day} text={shareText} result={choice === scan ? "agree" : "differ"} />
            <p className="text-center text-sm text-muted-foreground">
              Streak {stats.streak} · Best {stats.best} · Days voted {stats.played}. New matchup at midnight UTC.
            </p>
          </div>
        )}

        {yesterdayPair && yesterday && (
          <p className="rounded-2xl border border-border p-4 text-sm text-muted-foreground">
            Yesterday: {yesterday[0]}% picked {yesterdayPair[0].name}, {yesterday[1]}% picked {yesterdayPair[1].name}. The scan says {yesterdayPair[scanPick(yesterdayPair)].name} is more cooked.
          </p>
        )}

        <Link href="/activities/wordle" className="block text-center text-sm font-semibold underline underline-offset-4">
          Next up: Major Wordle
        </Link>
        <p className="text-center text-xs text-muted-foreground">Entertainment, not career advice.</p>
      </div>
    </main>
  );
}
