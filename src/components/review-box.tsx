"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Star, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuccessIcon } from "@/components/ui/animated-state-icons";

const MAX_COMMENT = 500;
const STORAGE_KEY = "cm_reviewed";
const SNOOZE_KEY = "cm_review_snooze"; // when to ask again after "Maybe later" (ms timestamp)
const SNOOZE_MS = 3 * 24 * 60 * 60 * 1000;
const RESULT_DELAY_MS = 8000; // how long after a result is shown before we ask

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

function snoozed(): boolean {
  try {
    return Date.now() < Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
  } catch {
    return false;
  }
}
function snooze() {
  try {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_MS));
  } catch {}
}

// A small rating card that slides in a few seconds after the visitor sees their result, the way apps ask
// for a rating. It is never shown on the landing page before a scan. It never blocks the page. "Maybe later" or the X hides it for
// three days; sending a review hides it for good. Reviews go to /api/review (which forwards them to Telegram).
export function ReviewPopup({ majorName, hasResult }: { majorName?: string; hasResult: boolean }) {
  const reduceMotion = useReducedMotion();
  const reviewed = useSyncExternalStore(subscribe, getReviewed, getServerReviewed);
  const [open, setOpen] = useState(false);
  const [closed, setClosed] = useState(false); // closed during this visit: don't show again until reload
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [hp, setHp] = useState(""); // honeypot: real visitors never see or fill this
  const [status, setStatus] = useState<Status>("idle");

  // Start the timer once a result is showing. No result, no popup.
  useEffect(() => {
    if (!hasResult || closed || open || reviewed) return;
    const id = setTimeout(() => {
      if (!getReviewed() && !snoozed()) setOpen(true);
    }, RESULT_DELAY_MS);
    return () => clearTimeout(id);
  }, [hasResult, closed, open, reviewed]);

  const dismiss = () => {
    if (status !== "sent") snooze();
    setOpen(false);
    setClosed(true);
  };

  // Escape closes it (it isn't a blocking dialog, so this works wherever focus is)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (status !== "sent") snooze();
        setOpen(false);
        setClosed(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, status]);

  // After a successful send, show the thanks for a moment and then tuck the card away
  useEffect(() => {
    if (status !== "sent") return;
    const id = setTimeout(() => {
      setOpen(false);
      setClosed(true);
    }, 3000);
    return () => clearTimeout(id);
  }, [status]);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.section
          role="dialog"
          aria-labelledby="review-title"
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed inset-x-4 bottom-[calc(1rem_+_var(--sticky-cta-h,0px))] z-[90] sm:left-auto sm:right-6 sm:bottom-[calc(1.5rem_+_var(--sticky-cta-h,0px))] sm:w-[360px] rounded-3xl border border-border bg-card/95 p-5 shadow-2xl backdrop-blur-xl transition-[bottom] duration-200 motion-reduce:transition-none"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-4 w-4" />
          </button>

          {status === "sent" ? (
            <div role="status" className="flex items-center gap-3 py-2 pr-6">
              <SuccessIcon active size={40} className="shrink-0 text-emerald-500" />
              <p className="text-base font-black tracking-tight">Thanks for the review!</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1 pr-8">
                <h2 id="review-title" className="text-lg font-black tracking-tighter uppercase italic leading-tight">
                  Enjoying the scan?
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Rate it. A few words are optional, and please leave out personal details.
                </p>
              </div>

              <div
                role="radiogroup"
                aria-label="Rating out of 5 stars"
                className="flex items-center gap-0.5"
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
                        "h-8 w-8 transition-colors motion-reduce:transition-none",
                        n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"
                      )}
                    />
                  </button>
                ))}
              </div>

              {rating > 0 && (
                <div className="space-y-1">
                  <label htmlFor="review-comment" className="sr-only">
                    Tell us more (optional)
                  </label>
                  <textarea
                    id="review-comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={MAX_COMMENT}
                    rows={2}
                    placeholder="What was good, what was off? (optional)"
                    className="w-full resize-none rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}

              {/* Honeypot */}
              <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Leave this empty
                  <input tabIndex={-1} autoComplete="off" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={rating === 0 || status === "sending"}
                  className="rounded-full bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  {status === "sending" ? "Sending…" : "Send"}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="text-xs font-black uppercase tracking-widest text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                >
                  Maybe later
                </button>
              </div>
              {status === "error" && (
                <p role="alert" className="text-xs font-bold text-destructive">
                  Couldn&apos;t send that. Please try again.
                </p>
              )}
              {status === "limited" && (
                <p role="alert" className="text-xs font-bold text-destructive">
                  You&apos;ve sent a few reviews already. Please try again later.
                </p>
              )}
            </form>
          )}
        </motion.section>
      )}
    </AnimatePresence>
  );
}
