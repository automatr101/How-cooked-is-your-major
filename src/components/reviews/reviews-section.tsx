"use client";

import { Star } from "lucide-react";
import { MIN_RATINGS_FOR_AVERAGE } from "@/lib/reviews/min";
import { usePublicReviews } from "./use-public-reviews";
import { FriendQuotes } from "@/components/friends-row";
import { FRIENDS } from "@/content/friends";

// Real reviews, only when they exist. Renders NOTHING while there is nothing real to show: no heading, no empty state, no
// placeholder. Each number is a real count of approved submissions, labelled by where it came from. An average appears
// only once there are MIN_RATINGS_FOR_AVERAGE ratings of that kind; before that the count is shown instead.

const plural = (n: number, one: string, many: string) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

function Stars({ value }: { value: number }) {
  return (
    <span aria-label={`${value} out of 5 stars`} className="inline-flex">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} aria-hidden className={n <= Math.round(value) ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-muted-foreground/40"} />
      ))}
    </span>
  );
}

export function ReviewsSection({ majorSlug, className = "" }: { majorSlug?: string; className?: string }) {
  const r = usePublicReviews(majorSlug);
  if (!r?.enabled) return null;

  const lines: React.ReactNode[] = [];
  if (r.verified.count > 0) {
    lines.push(
      r.verified.average != null ? (
        <span key="v" className="inline-flex items-center gap-2">
          <Stars value={r.verified.average} />
          <b className="text-foreground">{r.verified.average.toFixed(1)}</b> from {plural(r.verified.count, "verified purchase", "verified purchases")}
        </span>
      ) : (
        <span key="v">{plural(r.verified.count, "verified purchase rating", "verified purchase ratings")} so far (the average shows at {MIN_RATINGS_FOR_AVERAGE})</span>
      )
    );
  }
  if (r.free.accurateTotal > 0 && r.free.accuracyPercent != null) {
    lines.push(
      r.free.accuracyPercent != null ? (
        <span key="a">
          <b className="text-foreground">{r.free.accuracyPercent}%</b> of {plural(r.free.accurateTotal, "free scan vote", "free scan votes")} said their score was accurate
        </span>
      ) : null
    );
  }
  if (r.free.ratingCount > 0) {
    lines.push(
      r.free.average != null ? (
        <span key="f" className="inline-flex items-center gap-2">
          <Stars value={r.free.average} />
          <b className="text-foreground">{r.free.average.toFixed(1)}</b> from {plural(r.free.ratingCount, "free scan rating", "free scan ratings")}
        </span>
      ) : (
        <span key="f">{plural(r.free.ratingCount, "free scan rating", "free scan ratings")} so far</span>
      )
    );
  }
  const hasFriends = FRIENDS.some((f) => f.quote);
  if (lines.length === 0 && r.items.length === 0 && !hasFriends) return null;

  return (
    <section aria-label="Reviews" className={`space-y-4 ${className}`}>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">What people say</p>
      {lines.length > 0 && (
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {lines.map((l, i) => (
            <p key={i}>{l}</p>
          ))}
        </div>
      )}
      <FriendQuotes />
      {r.items.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {r.items.slice(0, 4).map((it, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card/60 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded-full border border-border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{it.label}</span>
                {it.rating != null && <Stars value={it.rating} />}
              </div>
              <p className="mt-2 text-sm leading-relaxed">&ldquo;{it.comment}&rdquo;</p>
              <p className="mt-2 text-[11px] font-bold text-muted-foreground">{[it.name, it.major, it.country].filter(Boolean).join(" · ")}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
