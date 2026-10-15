"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePublicReviews } from "./use-public-reviews";

// Shown at the end of the plan a buyer has just unlocked. Stars, an optional line, and a box they must tick before
// anything is shown publicly: their first name or initial, their major and their country (the country is the one our host
// saw, never typed). The server checks the unlock cookie, so only a real buyer can post this. Nothing appears on the site
// until the owner approves it.

const MAX_COMMENT = 300;
const key = (slug: string) => `cm_plan_reviewed:${slug}`;
const already = (slug: string) => {
  try {
    return localStorage.getItem(key(slug)) === "1";
  } catch {
    return false;
  }
};

type State = "idle" | "sending" | "sent" | "duplicate" | "limited" | "error";

export function PlanReviewForm({ majorName, slug }: { majorName: string; slug: string }) {
  const reviews = usePublicReviews(slug);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [name, setName] = useState("");
  const [hp, setHp] = useState("");
  const [state, setState] = useState<State>("idle");
  const [done, setDone] = useState<boolean | undefined>(undefined);

  if (!reviews?.enabled) return null;
  if ((done ?? already(slug)) && state !== "sent" && state !== "duplicate") return null;

  const shown = hover || rating;
  const canSend = rating > 0 && (!consent || name.trim().length > 0) && state !== "sending";

  const remember = () => {
    try {
      localStorage.setItem(key(slug), "1");
    } catch {}
    setDone(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setState("sending");
    try {
      const res = await fetch("/api/reviews/rating", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ major: majorName, rating, comment, consent, name: consent ? name : "", hp }),
      });
      if (res.status === 409) {
        remember();
        return setState("duplicate");
      }
      if (res.status === 429) return setState("limited");
      if (!res.ok && res.status !== 204) return setState("error");
      remember();
      setState("sent");
    } catch {
      setState("error");
    }
  };

  if (state === "sent" || state === "duplicate") {
    return (
      <div role="status" className="border-t border-border/20 pt-8 text-sm font-bold">
        {state === "sent" ? "Thank you. Your review is saved and will appear on the site once we have read it." : "You have already reviewed this plan. Thank you."}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="relative space-y-4 border-t border-border/20 pt-8">
      <div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Your review</p>
        <h3 className="mt-1 text-xl font-black italic uppercase tracking-tighter">How was your plan?</h3>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Honest is best. It is marked &ldquo;Verified purchase&rdquo; because it comes from a paid plan.</p>
      </div>

      <div role="radiogroup" aria-label="Rating out of 5 stars" className="flex items-center gap-0.5" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="rounded-lg p-1 transition-transform hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <Star aria-hidden className={cn("h-9 w-9", n <= shown ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor="plan-review-comment" className="sr-only">One line about your plan (optional)</label>
        <textarea
          id="plan-review-comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={MAX_COMMENT}
          rows={3}
          placeholder="One line about your plan (optional). Please leave out personal details."
          className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
        <span>
          <span className="font-bold text-foreground">You may show my first name or initial, my major and my country</span> next to my review on the site. If I leave this
          unticked, my rating still counts but nothing about me is shown.
        </span>
      </label>

      {consent && (
        <div className="space-y-1">
          <label htmlFor="plan-review-name" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">First name or initial</label>
          <input
            id="plan-review-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
            autoComplete="given-name"
            placeholder="Ama, or A."
            className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <p className="text-[11px] text-muted-foreground">Shown as: {name.trim() || "…"}, {majorName}, and your country.</p>
        </div>
      )}

      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <input tabIndex={-1} autoComplete="off" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
      </div>

      <button
        type="submit"
        disabled={!canSend}
        className="rounded-full bg-primary px-6 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        {state === "sending" ? "Sending…" : "Send my review"}
      </button>
      {state === "limited" && (
        <p role="alert" className="text-xs font-bold text-destructive">
          You have sent a few reviews already. Please try again later.
        </p>
      )}
      {state === "error" && (
        <p role="alert" className="text-xs font-bold text-destructive">
          Could not send that. Please try again.
        </p>
      )}
    </form>
  );
}
