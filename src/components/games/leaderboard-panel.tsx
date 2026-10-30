"use client";

import { useCallback, useEffect, useState } from "react";
import { track } from "@/lib/analytics";

// Today's top 10 for a daily game. When `answers` is given (the player just finished), a small opt-in form lets them
// put their result on the board under a nickname. The browser sends what it played; the server works out the score.

type Entry = { rank: number; nickname: string; score: number };
type Board = { total: number; top: Entry[]; you: Entry | null };

const PID_KEY = "cm_pid";
const NICK_KEY = "cm_nick";

function store(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

// A random id for this browser. It is the "player": no account, never shown, never returned by the API.
function playerId(): string {
  const s = store();
  let id = s?.getItem(PID_KEY) ?? "";
  if (!/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    id = typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    try {
      s?.setItem(PID_KEY, id);
    } catch {}
  }
  return id;
}

const ERRORS: Record<string, string> = {
  bad_nickname: "Pick another name: 2 to 16 letters, numbers, spaces, dots or dashes, and keep it clean.",
  already_posted: "You are already on today's board.",
  wrong_day: "That puzzle is from another day.",
  too_many_requests: "Too many tries. Wait a bit.",
};

export function LeaderboardPanel({ game, day, answers, title }: { game: "wordle" | "cooked-or-cap"; day: number; answers?: unknown; title?: string }) {
  const [data, setData] = useState<Board | null>(null);
  const [failed, setFailed] = useState(false);
  const [nick, setNick] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const label = (n: number) => (game === "wordle" ? `${n} ${n === 1 ? "guess" : "guesses"}` : `${n}/10`);

  const load = useCallback(async () => {
    try {
      const pid = store()?.getItem(PID_KEY);
      const res = await fetch(`/api/games/leaderboard?game=${game}${pid ? `&pid=${encodeURIComponent(pid)}` : ""}`);
      if (!res.ok) throw new Error();
      setData((await res.json()) as Board);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [game]);

  useEffect(() => {
    load();
    setNick(store()?.getItem(NICK_KEY) ?? "");
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/games/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game, day, playerId: playerId(), nickname: nick, answers }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        try {
          store()?.setItem(NICK_KEY, nick.trim());
        } catch {}
        setData(json as Board);
        track("leaderboard_post", { game, day });
      } else if (res.status === 409) {
        await load();
      } else {
        setError(ERRORS[(json as { error?: string }).error ?? ""] ?? "Could not post it right now. Try again later.");
      }
    } catch {
      setError("Could not post it right now. Try again later.");
    } finally {
      setBusy(false);
    }
  };

  const onBoard = !!data?.you;
  const showForm = answers !== undefined && data !== null && !onBoard;

  return (
    <section aria-label={title ?? "Today's leaderboard"} className="space-y-3 rounded-2xl border border-foreground/15 p-4 text-left">
      <h3 className="text-sm font-black uppercase tracking-widest">{title ?? "Today's leaderboard"}</h3>

      {showForm && (
        <form onSubmit={submit} className="space-y-2">
          <label htmlFor={`nick-${game}`} className="text-sm text-muted-foreground">
            Post your result under a nickname. Optional, no account needed.
          </label>
          <div className="flex gap-2">
            <input
              id={`nick-${game}`}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              maxLength={16}
              autoComplete="off"
              placeholder="Nickname"
              className="h-11 min-w-0 flex-1 rounded-full border border-foreground/20 bg-transparent px-4 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
            />
            <button
              type="submit"
              disabled={busy || nick.trim().length < 2}
              className="h-11 rounded-full bg-foreground px-5 text-sm font-semibold text-background transition enabled:active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
            >
              Post
            </button>
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </form>
      )}

      {failed ? (
        <p className="text-sm text-muted-foreground">The leaderboard is not available right now.</p>
      ) : !data ? (
        <div className="h-16" aria-hidden />
      ) : data.top.length === 0 ? (
        <p className="text-sm text-muted-foreground">No scores yet today. Be the first.</p>
      ) : (
        <>
          <ol className="space-y-1 text-sm">
            {data.top.map((r) => (
              <li key={r.rank} className={`flex items-center justify-between rounded-lg px-3 py-2 ${data.you?.rank === r.rank ? "bg-foreground/10 font-semibold" : ""}`}>
                <span>
                  <span className="mr-3 inline-block w-5 text-muted-foreground">{r.rank}</span>
                  {r.nickname}
                </span>
                <span>{label(r.score)}</span>
              </li>
            ))}
          </ol>
          {data.you && data.you.rank > 10 && (
            <p className="text-sm">
              You: #{data.you.rank} · {label(data.you.score)}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{data.total} on the board today. Resets at midnight UTC.</p>
        </>
      )}
    </section>
  );
}
