"use client";

import { useState, useSyncExternalStore } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_COMMENT = 500;
const STORAGE_KEY = "cm_reviewed";

type Status = "idle" | "sending" | "sent" | "error" | "limited";

// "Has this browser already sent a review?" lives in localStorage. Reading it through
// useSyncExternalStore keeps server and first client render identical (false) and then
// updates, without setting state inside an effect.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const getReviewed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};
const getServerReviewed = () => false;
function setReviewed(value: boolean) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, "1");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
  listeners.forEach((l) => l());
}

// Star rating plus an optional comment, sent to /api/review (which forwards it to Telegram).
export function ReviewBox({ majorName }: { majorName?: string }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [hp, setHp] = useState(""); // honeypot: real visitors never see or fill this
  const [status, setStatus] = useState<Status>("idle");
  const reviewed = useSyncExternalStore(subscribe, getReviewed, getServerReviewed);
  const sent = status === "sent" || reviewed; // thank instead of asking again

  const shown = hover || rating;

  const onStarKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, n: number) => {
    let next = n;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(5, n + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(1, n - 1);
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = 5;
    else return;
    e.preventDefault();
    setRating(next);
    (e.currentTarget.parentElement?.children[next - 1] as HTMLElement | undefined)?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0 || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, major: majorName, hp }),
      });
      if (res.status === 429) return setStatus("limited");
      if (!res.ok) return setStatus("error");
      setReviewed(true);
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  };

  const again = () => {
    setReviewed(false);
    setRating(0);
    setComment("");
    setStatus("idle");
  };

  return (
    <section aria-labelledby="review-title" className="w-full max-w-2xl px-6 mt-24">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h2 id="review-title" className="text-2xl sm:text-3xl font-black tracking-tighter uppercase italic leading-none">
            Rate your experience
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Was the scan useful? Leave a rating, and a few words if you like. Please don&apos;t include personal details.
          </p>
        </div>

        {sent ? (
          <div role="status" className="space-y-3">
            <p className="text-lg font-bold">Thanks for the review! 🙌</p>
            <button
              type="button"
              onClick={again}
              className="text-xs font-black uppercase tracking-widest text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Write another
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div
              role="radiogroup"
              aria-label="Rating out of 5 stars"
              className="flex items-center gap-1"
              onMouseLeave={() => setHover(0)}
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  tabIndex={rating === n || (rating === 0 && n === 1) ? 0 : -1}
                  onClick={() => setRating(n)}
                  onMouseEnter={() => setHover(n)}
                  onKeyDown={(e) => onStarKeyDown(e, n)}
                  className="rounded-lg p-1 transition-transform hover:scale-110 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                >
                  <Star
                    aria-hidden
                    className={cn(
                      "h-9 w-9 transition-colors motion-reduce:transition-none",
                      n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                    )}
                  />
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="review-comment" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                Tell us more (optional)
              </label>
              <textarea
                id="review-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={MAX_COMMENT}
                rows={3}
                placeholder="What was good, what was off?"
                className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-right text-[10px] font-bold text-muted-foreground/60" aria-hidden>
                {comment.length}/{MAX_COMMENT}
              </p>
            </div>

            {/* Honeypot */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Leave this empty
                <input tabIndex={-1} autoComplete="off" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
              </label>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="submit"
                disabled={rating === 0 || status === "sending"}
                className="rounded-full bg-primary px-7 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {status === "sending" ? "Sending…" : "Send review"}
              </button>
              {rating === 0 && <span className="text-xs text-muted-foreground">Pick a star rating to send.</span>}
              {status === "error" && (
                <span role="alert" className="text-xs font-bold text-destructive">
                  Couldn&apos;t send that. Please try again.
                </span>
              )}
              {status === "limited" && (
                <span role="alert" className="text-xs font-bold text-destructive">
                  You&apos;ve sent a few reviews already. Please try again later.
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
