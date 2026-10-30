"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buildQuiz } from "@/lib/games/cooked-or-cap";
import { dayNumber, EMPTY_STATS, load, save, type Stats } from "@/lib/games/daily";
import { track } from "@/lib/analytics";
import { notifyGame } from "@/lib/notify";
import { GameCard } from "@/components/games/game-card";
import { ShareActions } from "@/components/games/share-actions";
import { LeaderboardPanel } from "@/components/games/leaderboard-panel";

const KEY = "cm_cooked_or_cap_v1";
type Saved = { day: number; answers: number[]; stats: Stats & { totalCorrect: number } };
const EMPTY: Saved["stats"] = { ...EMPTY_STATS, totalCorrect: 0 };

export function QuizClient() {
  const [day, setDay] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [stats, setStats] = useState<Saved["stats"]>(EMPTY);
  const [shown, setShown] = useState(false); // the answer to the current question is on screen
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = dayNumber();
    const saved = load<Saved>(KEY, { day: 0, answers: [], stats: EMPTY });
    setDay(d);
    setStats(saved.stats);
    if (saved.day === d) setAnswers(saved.answers);
  }, []);

  const quiz = useMemo(() => (day > 0 ? buildQuiz(day) : []), [day]);
  const done = quiz.length > 0 && answers.length >= quiz.length;
  // while the answer is on screen the question stays the one just answered, even though answers has already grown
  const idx = shown ? answers.length - 1 : Math.min(answers.length, Math.max(quiz.length - 1, 0));
  const q = quiz[idx];
  const correctFlags = answers.map((a, i) => a === quiz[i]?.correct);
  const score = correctFlags.filter(Boolean).length;

  const choose = (opt: number) => {
    if (!q || shown) return;
    if (answers.length === 0) track("game_start", { game: "cooked-or-cap", day });
    const next = [...answers, opt];
    setAnswers(next);
    setShown(true);
    if (next.length >= quiz.length) {
      const total = next.filter((a, i) => a === quiz[i].correct).length;
      const streak = stats.lastDay === day - 1 && stats.streak > 0 ? stats.streak + 1 : 1; // played that day = streak, win or lose
      const newStats = {
        played: stats.played + 1,
        won: stats.won + (total >= 7 ? 1 : 0),
        streak,
        best: Math.max(stats.best, streak),
        lastDay: day,
        totalCorrect: stats.totalCorrect + total,
      };
      setStats(newStats);
      save(KEY, { day, answers: next, stats: newStats });
      track("game_complete", { game: "cooked-or-cap", day, result: String(total) });
      notifyGame("cooked-or-cap", String(total), day);
    } else {
      save(KEY, { day, answers: next, stats });
    }
  };

  const next = () => setShown(false);
  // a returning visitor who already finished sees the result straight away
  const finished = done && !shown;
  const lastIsDone = done && shown; // show reveal for the final answer, then the result

  const shareText = `Cooked or Cap? #${day} ${score}/${quiz.length}\n${correctFlags.map((c) => (c ? "🟩" : "🟥")).join("")}`;

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-6 font-sans text-foreground sm:p-6 md:p-12">
      <div className="mx-auto max-w-md space-y-6">
        <Link href="/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Activities
        </Link>
        <header>
          <h1 className="text-4xl font-black uppercase leading-[0.98]">
            Cooked or <span className="text-[#FF6A00]">cap?</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ten questions a day on degrees and jobs. Scores come from our scan, stats from the WEF Future of Jobs Report 2025 (projections). {day > 0 && `#${day}.`}
          </p>
        </header>

        {day === 0 || !q ? (
          <div className="h-64" aria-hidden />
        ) : finished ? (
          renderResult()
        ) : (
          <section className="space-y-4" aria-live="polite">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Question {idx + 1} of {quiz.length}
            </p>
            <h2 className="text-xl font-bold leading-snug">{q.prompt}</h2>
            <div className="grid gap-3">
              {q.options.map((o, i) => {
                const picked = shown && answers[idx] === i;
                const right = shown && q.correct === i;
                return (
                  <button
                    key={o}
                    type="button"
                    disabled={shown}
                    onClick={() => choose(i)}
                    style={right ? { background: "#00BC7D", color: "#0C0C0C", borderColor: "#00BC7D" } : picked ? { background: "#E54D2E", color: "#0C0C0C", borderColor: "#E54D2E" } : undefined}
                    className="min-h-14 rounded-2xl border-2 border-foreground/20 px-4 py-3 text-left text-base font-semibold transition enabled:hover:border-foreground/50 enabled:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
                  >
                    {o}
                    {shown && right && <span className="ml-2 text-sm font-bold">Correct</span>}
                    {picked && !right && <span className="ml-2 text-sm font-bold">Nope</span>}
                  </button>
                );
              })}
            </div>
            {shown && (
              <div className="space-y-3 rounded-2xl bg-foreground/5 p-4 text-sm">
                <p>{q.reveal}</p>
                {q.source && <p className="text-xs text-muted-foreground">Source: {q.source}</p>}
                <button
                  type="button"
                  onClick={next}
                  className="h-11 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
                >
                  {lastIsDone ? "See result" : "Next"}
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );

  function renderResult() {
    return (
      <div className="space-y-5">
        <GameCard title="Cooked or Cap" subtitle={`#${day}`} ref={cardRef}>
          <div className="space-y-3">
            <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1 }}>
              {score}
              <span style={{ fontSize: 32, color: "#A6A6A6" }}>/{quiz.length}</span>
            </div>
            <div className="flex justify-center gap-1.5">
              {correctFlags.map((c, i) => (
                <span key={i} style={{ width: 20, height: 20, borderRadius: 6, background: c ? "#00BC7D" : "#E54D2E" }} />
              ))}
            </div>
          </div>
        </GameCard>
        <ShareActions cardRef={cardRef} game="cooked-or-cap" day={day} text={shareText} result={String(score)} />
        <LeaderboardPanel game="cooked-or-cap" day={day} answers={answers} />
        <p className="text-center text-sm text-muted-foreground">
          Streak {stats.streak} · Best {stats.best} · Days played {stats.played}. New questions at midnight UTC.
        </p>
        <Link href="/activities/wordle" className="block text-center text-sm font-semibold underline underline-offset-4">
          Next up: Major Wordle
        </Link>
      </div>
    );
  }
}
