"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, RotateCcw, Share2 } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { track } from "@/lib/analytics";

// Tic-Tac-Toe against a friend on another phone. The server holds the game (so nobody can cheat) and this component asks it
// for the latest every second or two while the tab is open. A seat is held by a secret token kept in this browser.

type Cell = "X" | "O" | null;
type Room = { code: string; seat: "X" | "O"; board: Cell[]; turn: "X" | "O"; status: "waiting" | "playing" | "won" | "draw"; winner: "X" | "O" | null; line: number[] | null; round: number };
type Session = { code: string; token: string };

const KEY = "cm_ttt_online_v1";
const POLL_MS = 1500;

const read = (): Session | null => {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return s && /^[A-Z0-9]{5}$/.test(s.code) && /^[a-f0-9]{32}$/.test(s.token) ? s : null;
  } catch {
    return null;
  }
};
const write = (s: Session | null) => {
  try {
    if (s) localStorage.setItem(KEY, JSON.stringify(s));
    else localStorage.removeItem(KEY);
  } catch {}
};

const inviteLink = (code: string) =>
  `${SITE_URL}/activities/tic-tac-toe?room=${code}&utm_source=friend_invite&utm_medium=referral&utm_campaign=games_share&utm_content=tic-tac-toe`;

export function TicTacToeOnline({ inviteCode }: { inviteCode: string | null }) {
  const [session, setSession] = useState<Session | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [typed, setTyped] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const attempted = useRef(""); // the invite code already tried, so the link is only joined once
  const finished = useRef<string>(""); // "code:round" already reported, so a finished game is counted once

  const post = useCallback(async (payload: Record<string, unknown>) => {
    const res = await fetch("/api/games/ttt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json: json as Record<string, unknown> };
  }, []);

  const leave = useCallback((message = "") => {
    write(null);
    setSession(null);
    setRoom(null);
    setNote(message);
  }, []);

  const join = useCallback(
    async (code: string) => {
      setBusy(true);
      setNote("");
      try {
        const r = await post({ action: "join", code });
        if (r.ok) {
          const s = { code: r.json.code as string, token: r.json.token as string };
          write(s);
          setSession(s);
          track("game_start", { game: "tic-tac-toe", mode: "online" });
        } else {
          setNote(r.status === 404 ? "No game with that code." : r.status === 409 ? "That game already has two players." : "Could not join right now. Try again.");
        }
      } catch {
        setNote("Could not join right now. Try again.");
      } finally {
        setBusy(false);
      }
    },
    [post]
  );

  // On open: resume the game this browser was in, otherwise join the one in the invite link
  useEffect(() => {
    const saved = read();
    if (saved && (!inviteCode || saved.code === inviteCode)) {
      setSession(saved);
    } else if (inviteCode && attempted.current !== inviteCode) {
      attempted.current = inviteCode; // once per link (React can run this effect twice in development)
      join(inviteCode);
    }
  }, [inviteCode, join]);

  // Ask for the latest game while one is open
  useEffect(() => {
    if (!session) return;
    let stop = false;
    const tick = async () => {
      if (document.hidden) return;
      try {
        const res = await fetch(`/api/games/ttt?code=${session.code}&token=${session.token}`, { cache: "no-store" });
        if (stop) return;
        if (res.status === 404) return leave("That game is gone.");
        if (res.ok) setRoom((await res.json()) as Room);
      } catch {}
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => !document.hidden && tick();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stop = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [session, leave]);

  // Count a finished game once per round
  useEffect(() => {
    if (!room || (room.status !== "won" && room.status !== "draw")) return;
    const id = `${room.code}:${room.round}`;
    if (finished.current === id) return;
    finished.current = id;
    track("game_complete", { game: "tic-tac-toe", result: room.status === "draw" ? "draw-online" : room.winner === room.seat ? "win-online" : "loss-online" });
  }, [room]);

  const create = async () => {
    setBusy(true);
    setNote("");
    try {
      const r = await post({ action: "create" });
      if (r.ok) {
        const s = { code: r.json.code as string, token: r.json.token as string };
        write(s);
        setSession(s);
        track("game_start", { game: "tic-tac-toe", mode: "online" });
      } else {
        setNote(r.status === 429 ? "Too many games started. Wait a bit." : "Could not start a game right now. Try again.");
      }
    } catch {
      setNote("Could not start a game right now. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const play = async (cell: number) => {
    if (!session || !room || room.status !== "playing" || room.turn !== room.seat || room.board[cell]) return;
    setRoom({ ...room, board: room.board.map((c, i) => (i === cell ? room.seat : c)), turn: room.seat === "X" ? "O" : "X" }); // show it at once; the server's answer follows
    const r = await post({ action: "move", ...session, cell }).catch(() => null);
    if (r?.ok) setRoom(r.json as unknown as Room);
    else {
      const res = await fetch(`/api/games/ttt?code=${session.code}&token=${session.token}`, { cache: "no-store" }).catch(() => null);
      if (res?.ok) setRoom((await res.json()) as Room);
    }
  };

  const again = async () => {
    if (!session) return;
    const r = await post({ action: "rematch", ...session }).catch(() => null);
    if (r?.ok) setRoom(r.json as unknown as Room);
  };

  const share = async () => {
    if (!session) return;
    const url = inviteLink(session.code);
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ text: "Tic-Tac-Toe? I made a game.", url });
        track("game_share", { game: "tic-tac-toe", method: "native_share" });
        return;
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
    }
    try {
      await navigator.clipboard.writeText(url);
      track("game_share", { game: "tic-tac-toe", method: "copy_link" });
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (!session) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={create}
          disabled={busy}
          className="h-12 w-full rounded-full bg-foreground px-6 text-sm font-semibold text-background transition enabled:active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        >
          Start a game and invite a friend
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.length === 5) join(typed);
          }}
          className="flex gap-2"
        >
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 5))}
            aria-label="Game code"
            placeholder="Friend's code"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-full border border-foreground/20 bg-transparent px-4 text-sm uppercase tracking-widest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
          />
          <button
            type="submit"
            disabled={busy || typed.length !== 5}
            className="h-11 rounded-full border border-foreground/30 px-5 text-sm font-semibold transition enabled:active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
          >
            Join
          </button>
        </form>
        {note && (
          <p role="alert" className="text-sm text-destructive">
            {note}
          </p>
        )}
      </div>
    );
  }

  const mine = room?.turn === room?.seat;
  const status = !room
    ? "Loading..."
    : room.status === "waiting"
      ? "Waiting for your friend to join."
      : room.status === "won"
        ? room.winner === room.seat
          ? "You win."
          : "Your friend wins."
        : room.status === "draw"
          ? "Draw."
          : mine
            ? `Your move (${room.seat}).`
            : "Friend's move...";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Game <span className="font-black tracking-widest text-foreground">{session.code}</span>
          {room && <> · you are {room.seat}</>}
        </span>
        <button type="button" onClick={() => leave()} className="underline underline-offset-4">
          Leave
        </button>
      </div>

      {room?.status === "waiting" && (
        <button
          type="button"
          onClick={share}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
        >
          {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
          {copied ? "Link copied" : "Send invite link"}
        </button>
      )}

      <div role="grid" aria-label="Board" className="mx-auto grid w-fit grid-cols-3 gap-2">
        {(room?.board ?? Array<Cell>(9).fill(null)).map((c, i) => {
          const onLine = room?.line?.includes(i);
          return (
            <button
              key={i}
              type="button"
              role="gridcell"
              aria-label={`Square ${i + 1}, ${c ?? "empty"}`}
              disabled={!!c || !room || room.status !== "playing" || !mine}
              onClick={() => play(i)}
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

      {(room?.status === "won" || room?.status === "draw") && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={again}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-semibold text-background transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60"
          >
            <RotateCcw className="h-4 w-4" /> Play again
          </button>
        </div>
      )}
      {note && <p className="text-center text-sm text-muted-foreground">{note}</p>}
    </div>
  );
}
