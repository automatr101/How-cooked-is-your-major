"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { bestMove, easyMove, isFull, winner, type Board } from "@/lib/games/tictactoe";
import { load, save } from "@/lib/games/daily";
import { track } from "@/lib/analytics";
import { notifyGame } from "@/lib/notify";
import { TicTacToeOnline } from "@/components/games/ttt-online";

type Mode = "easy" | "hard" | "friend" | "online";
type Tally = { win: number; loss: number; draw: number };
type Saved = { easy: Tally; hard: Tally };

const KEY = "cm_tictactoe_v1";
const NO_TALLY: Tally = { win: 0, loss: 0, draw: 0 };
const MODES: { id: Mode; label: string }[] = [
  { id: "easy", label: "AI: easy" },
  { id: "hard", label: "AI: unbeatable" },
  { id: "friend", label: "Same phone" },
  { id: "online", label: "Online friend" },
];

export function TicTacToeClient() {
  const [mode, setMode] = useState<Mode>("easy");
  const [board, setBoard] = useState<Board>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const [round, setRound] = useState(0); // who opens alternates: you (X) on even rounds, the AI / player two (O) on odd ones
  const [tally, setTally] = useState<Saved>({ easy: NO_TALLY, hard: NO_TALLY });
  const [started, setStarted] = useState(false);
  const [invite, setInvite] = useState<string | null>(null); // ?room=CODE from a friend's invite link

  useEffect(() => {
    const t = load<Saved>(KEY, { easy: NO_TALLY, hard: NO_TALLY });
    // Reading the saved score is browser-only, so it has to happen after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTally(t);
    const room = new URLSearchParams(location.search).get("room")?.toUpperCase() ?? "";
    if (/^[A-Z0-9]{5}$/.test(room)) {
      setInvite(room);
      setMode("online");
    }
  }, []);

  const win = winner(board);
  const over = !!win || isFull(board);
  const vsAi = mode === "easy" || mode === "hard";

  const reset = useCallback((nextRound: number) => {
    setBoard(Array(9).fill(null));
    setTurn(nextRound % 2 === 0 ? "X" : "O"); // O opens on odd rounds
    setRound(nextRound);
  }, []);

  const finish = useCallback(
    (b: Board) => {
      if (mode !== "easy" && mode !== "hard") return;
      const w = winner(b);
      const outcome: keyof Tally = w ? (w.who === "X" ? "win" : "loss") : "draw";
      setTally((prev) => {
        const next = { ...prev, [mode]: { ...prev[mode], [outcome]: prev[mode][outcome] + 1 } };
        save(KEY, next);
        return next;
      });
      track("game_complete", { game: "tic-tac-toe", result: `${outcome}-${mode}` });
      notifyGame("tic-tac-toe", `${outcome}-${mode === "hard" ? "hard" : "easy"}`);
    },
    [mode]
  );

  const play = useCallback(
    (i: number, who: "X" | "O") => {
      if (board[i] || over) return;
      if (!started) {
        setStarted(true);
        track("game_start", { game: "tic-tac-toe", mode });
      }
      const next = board.slice();
      next[i] = who;
      setBoard(next);
      setTurn(who === "X" ? "O" : "X");
      if (winner(next) || isFull(next)) finish(next);
    },
    [board, over, started, mode, finish]
  );

  // The computer plays O after a short pause
  useEffect(() => {
    if (!vsAi || over || turn !== "O") return;
    const id = window.setTimeout(() => play((mode === "hard" ? bestMove : easyMove)(board, "O"), "O"), 450);
    return () => window.clearTimeout(id);
  }, [vsAi, over, turn, board, mode, play]);

  const chooseMode = (m: Mode) => {
    setMode(m);
    setStarted(false);
    reset(0);
  };

  const status = win
    ? vsAi
      ? win.who === "X"
        ? "You win."
        : "The AI wins."
      : `${win.who} wins.`
    : over
      ? "Draw."
      : vsAi
        ? turn === "X"
          ? "Your move (X)."
          : "AI is thinking..."
        : `${turn} to move.`;

  const t = mode === "easy" || mode === "hard" ? tally[mode] : null;

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-6 font-sans text-foreground sm:p-6 md:p-12">
      <div className="mx-auto max-w-md space-y-6">
        <Link href="/activities" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Activities
        </Link>
        <header>
          <h1 className="text-4xl font-black uppercase leading-[0.98]">
            Tic-Tac-<span className="text-[#FF6A00]">Toe.</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Beat the AI, pass the phone, or play a friend online. You are X.</p>
        </header>

        <div role="radiogroup" aria-label="Mode" className="flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => chooseMode(m.id)}
              className={`h-10 rounded-full border px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 ${
                mode === m.id ? "border-foreground bg-foreground text-background" : "border-foreground/20"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {mode === "online" ? (
          <TicTacToeOnline inviteCode={invite} />
        ) : (
          <>
        <div role="grid" aria-label="Board" className="mx-auto grid w-fit grid-cols-3 gap-2">
          {board.map((c, i) => {
            const onLine = win?.line.includes(i);
            return (
              <button
                key={i}
                type="button"
                role="gridcell"
                aria-label={`Square ${i + 1}, ${c ?? "empty"}`}
                disabled={!!c || over || (vsAi && turn === "O")}
                onClick={() => play(i, turn)}
                style={onLine ? { background: "#FF6A00", borderColor: "#FF6A00", color: "#0C0C0C" } : undefined}
                className="grid h-24 w-24 place-items-center rounded-2xl border-2 border-foreground/20 text-5xl font-black transition enabled:hover:border-foreground/50 enabled:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 sm:h-28 sm:w-28"
              >
                {c}
              </button>
            );
          })}
        </div>

        <p role="status" className="h-6 text-center font-semibold">
          {status}
        </p>

        <div className="flex flex-col items-center gap-3">
          {over && (
            <button
              type="button"
              onClick={() => reset(round + 1)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
            >
              <RotateCcw className="h-4 w-4" /> Play again
            </button>
          )}
          {t && (
            <p className="text-sm text-muted-foreground">
              Vs AI ({mode === "hard" ? "unbeatable" : "easy"}): {t.win} won · {t.draw} drawn · {t.loss} lost
            </p>
          )}
        </div>
          </>
        )}
      </div>
    </main>
  );
}
