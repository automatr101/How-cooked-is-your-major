"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Delete } from "lucide-react";
import { WORDLE_ANSWERS } from "@/content/games";
import { dayNumber, EMPTY_STATS, load, recordResult, save, type Stats } from "@/lib/games/daily";
import { track } from "@/lib/analytics";
import { GameCard } from "@/components/games/game-card";
import { ShareActions } from "@/components/games/share-actions";

const ROWS = 6;
const LEN = 5;
const KEY = "cm_wordle_v1";
type Mark = "hit" | "near" | "miss";
type Saved = { day: number; guesses: string[]; stats: Stats };

const FILL: Record<Mark, string> = { hit: "#00BC7D", near: "#FF6A00", miss: "#303030" };
const SQUARE: Record<Mark, string> = { hit: "🟩", near: "🟧", miss: "⬛" };
const WORD: Record<Mark, string> = { hit: "correct", near: "in the word, wrong spot", miss: "not in the word" };

/** Standard Wordle marking, repeated letters included. */
function mark(guess: string, answer: string): Mark[] {
  const res: Mark[] = Array(LEN).fill("miss");
  const left: Record<string, number> = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === answer[i]) res[i] = "hit";
    else left[answer[i]] = (left[answer[i]] ?? 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (res[i] === "hit") continue;
    if (left[guess[i]] > 0) {
      res[i] = "near";
      left[guess[i]]--;
    }
  }
  return res;
}

const KEYBOARD = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export function WordleClient() {
  const [day, setDay] = useState(0);
  const [guesses, setGuesses] = useState<string[]>([]);
  const [current, setCurrent] = useState("");
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [note, setNote] = useState("");
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const d = dayNumber();
    const saved = load<Saved>(KEY, { day: 0, guesses: [], stats: EMPTY_STATS });
    // Reading the saved game is browser-only, so it has to happen after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDay(d);
    setStats(saved.stats);
    if (saved.day === d) setGuesses(saved.guesses);
  }, []);

  const answer = day > 0 ? WORDLE_ANSWERS[(day - 1) % WORDLE_ANSWERS.length] : "";
  const marks = useMemo(() => guesses.map((g) => mark(g, answer)), [guesses, answer]);
  const won = guesses.at(-1) === answer;
  const over = won || guesses.length >= ROWS;

  // best mark per letter, for the keyboard
  const keyMarks = useMemo(() => {
    const rank: Record<Mark, number> = { miss: 0, near: 1, hit: 2 };
    const m: Record<string, Mark> = {};
    guesses.forEach((g, gi) =>
      [...g].forEach((ch, i) => {
        const v = marks[gi][i];
        if (!m[ch] || rank[v] > rank[m[ch]]) m[ch] = v;
      })
    );
    return m;
  }, [guesses, marks]);

  const submit = useCallback(() => {
    if (current.length < LEN) {
      setNote("Need 5 letters.");
      return;
    }
    const next = [...guesses, current];
    const finished = current === answer || next.length >= ROWS;
    const newStats = finished ? recordResult(stats, day, current === answer) : stats;
    if (guesses.length === 0) track("game_start", { game: "wordle", day });
    if (finished) track("game_complete", { game: "wordle", day, result: current === answer ? String(next.length) : "fail" });
    setGuesses(next);
    setCurrent("");
    setNote("");
    setStats(newStats);
    save(KEY, { day, guesses: next, stats: newStats });
  }, [current, guesses, answer, stats, day]);

  const press = useCallback(
    (k: string) => {
      if (over || day === 0) return;
      setNote("");
      if (k === "ENTER") submit();
      else if (k === "BACK") setCurrent((c) => c.slice(0, -1));
      else if (/^[A-Z]$/.test(k)) setCurrent((c) => (c.length < LEN ? c + k : c));
    },
    [over, day, submit]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") press("ENTER");
      else if (e.key === "Backspace") press("BACK");
      else if (/^[a-zA-Z]$/.test(e.key)) press(e.key.toUpperCase());
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press]);

  const shareText = `Major Wordle #${day} ${won ? guesses.length : "X"}/${ROWS}\n${marks.map((r) => r.map((m) => SQUARE[m]).join("")).join("\n")}`;

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-6 font-sans text-foreground sm:p-6 md:p-12">
      <div className="mx-auto max-w-md space-y-6">
        <Link href="/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Activities
        </Link>
        <header>
          <h1 className="text-4xl font-black uppercase leading-[0.98]">
            Major <span className="text-[#FF6A00]">Wordle.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One word a day, six tries. Campus, degree and career words. {day > 0 && `#${day}.`} Any five letters count as a guess.
          </p>
        </header>

        {day === 0 ? (
          <div className="h-80" aria-hidden />
        ) : (
          <>
            <div role="grid" aria-label="Guesses" className="mx-auto grid w-fit gap-1.5">
              {Array.from({ length: ROWS }, (_, r) => {
                const word = guesses[r] ?? (r === guesses.length ? current : "");
                return (
                  <div role="row" key={r} className="flex gap-1.5">
                    {Array.from({ length: LEN }, (_, c) => {
                      const m = marks[r]?.[c];
                      const ch = word[c] ?? "";
                      return (
                        <div
                          role="gridcell"
                          key={c}
                          aria-label={ch ? `${ch}, ${m ? WORD[m] : "typed"}` : "empty"}
                          style={m ? { background: FILL[m], borderColor: FILL[m], color: m === "miss" ? "#F4F4F4" : "#0C0C0C" } : undefined}
                          className={`grid h-14 w-14 place-items-center rounded-lg border-2 text-2xl font-black sm:h-16 sm:w-16 ${
                            ch && !m ? "border-foreground/60" : "border-foreground/15"
                          }`}
                        >
                          {ch}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <p role="status" className="h-5 text-center text-sm text-muted-foreground">
              {note || (over ? (won ? `Got it in ${guesses.length}.` : `The word was ${answer}.`) : "")}
            </p>

            {!over && (
              <div className="space-y-1.5" aria-label="Keyboard">
                {KEYBOARD.map((row, ri) => (
                  <div key={row} className="flex justify-center gap-1">
                    {ri === 2 && <Key label="ENTER" wide onPress={press} />}
                    {[...row].map((k) => (
                      <Key key={k} label={k} mark={keyMarks[k]} onPress={press} />
                    ))}
                    {ri === 2 && <Key label="BACK" wide onPress={press} />}
                  </div>
                ))}
              </div>
            )}

            {over && (
              <div className="space-y-5">
                <GameCard title="Major Wordle" subtitle={`#${day}  ${won ? guesses.length : "X"}/${ROWS}`} ref={cardRef}>
                  <div className="grid gap-1">
                    {marks.map((r, i) => (
                      <div key={i} className="flex gap-1">
                        {r.map((m, j) => (
                          <span key={j} style={{ width: 28, height: 28, borderRadius: 6, background: FILL[m] }} />
                        ))}
                      </div>
                    ))}
                  </div>
                </GameCard>
                <ShareActions cardRef={cardRef} game="wordle" day={day} text={shareText} result={won ? String(guesses.length) : "fail"} />
                <p className="text-center text-sm text-muted-foreground">
                  Streak {stats.streak} · Best {stats.best} · Won {stats.won}/{stats.played}. New word at midnight UTC.
                </p>
                <Link href="/activities/cooked-or-cap" className="block text-center text-sm font-semibold underline underline-offset-4">
                  Next up: Cooked or Cap?
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function Key({ label, mark: m, wide, onPress }: { label: string; mark?: Mark; wide?: boolean; onPress: (k: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPress(label)}
      aria-label={label === "BACK" ? "Delete" : label === "ENTER" ? "Enter" : label}
      style={m ? { background: FILL[m], color: m === "miss" ? "#A6A6A6" : "#0C0C0C" } : undefined}
      className={`grid h-12 place-items-center rounded-md text-sm font-bold transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 ${
        wide ? "w-14 text-xs" : "w-8 sm:w-9"
      } ${m ? "" : "bg-foreground/10"}`}
    >
      {label === "BACK" ? <Delete className="h-4 w-4" /> : label}
    </button>
  );
}
