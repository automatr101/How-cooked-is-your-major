"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { majors } from "@/lib/data";
import { track, slugify } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// Real results in the hero, as a deck: the current one in the middle, the next and previous ones half showing on either side.
// It moves on by itself every 3 seconds, and can be swiped (or arrow-keyed). Only these five confirmed scans are used, and the
// score and verdict come straight from the site's data (never typed in here), so the deck can never disagree with what a real
// scan of the same major shows. The roast lines are about the degree, never the person.

const SAMPLES: { name: string; line: string }[] = [
  { name: "Nursing", line: "AI can chart your vitals. It still can't find a vein at 3am." },
  { name: "Chemistry", line: "The lab still needs hands. AI just wants the lab report." },
  { name: "BSc. Human Resource Management", line: "AI screens the CVs now. Someone still has to handle the drama." },
  { name: "Law", line: "AI drafts the contract in nine seconds. The billable hours felt that." },
  { name: "Computer Science", line: "The degree that built AI is now training its replacement." },
];

const RESULTS = SAMPLES.flatMap((s) => {
  const m = majors.find((x) => x.name === s.name);
  return m ? [{ name: m.name, score: m.score, level: m.level, line: s.line }] : [];
});
type Result = (typeof RESULTS)[number];

/** Score bands: 0-39 green, 40-69 amber, 70-100 red. */
const band = (score: number) => (score >= 70 ? "#E54D2E" : score >= 40 ? "#FF6D00" : "#00BC7D");

const ROTATE_MS = 3000;
const SWIPE_PX = 40;

/** Glide to the search box and focus it (empty: nothing is prefilled). */
export function goToSearch() {
  const target = document.getElementById("search");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  window.setTimeout(() => target?.querySelector("input")?.focus({ preventScroll: true }), reduce ? 0 : 400);
}

function CardFace({ r }: { r: Result }) {
  const color = band(r.score);
  return (
    <>
      <span className="inline-block rounded-full border border-[#303030] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#A6A6A6]">Real scan result</span>
      <p className="mt-4 truncate text-sm font-bold text-[#F4F4F4]">{r.name}</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <p className="text-6xl font-black italic leading-none tracking-tighter tabular-nums" style={{ color }}>
          {r.score}
          <span className="text-3xl">%</span>
        </p>
        <span className="mb-1 shrink-0 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#0C0C0C]" style={{ backgroundColor: color }}>
          {r.level}
        </span>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-[#303030]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(r.score, 2)}%`, backgroundColor: color }} />
      </div>
      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm italic leading-snug text-[#A6A6A6]">&ldquo;{r.line}&rdquo;</p>
    </>
  );
}

/** Where a card sits relative to the current one: 0 = middle, -1/1 = half showing left/right, -2/2 = hidden behind. */
function slot(i: number, current: number, n: number): number {
  let d = (i - current + n) % n;
  if (d > n / 2) d -= n;
  return d;
}

export function SampleResultCard() {
  const reduceMotion = !!useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false); // tapped or swiped: the visitor is in control, so it stops moving on its own
  const rootRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const n = RESULTS.length;
  const paused = hovered || held || reduceMotion;

  const go = (step: number) => setIndex((i) => (i + step + n) % n);

  useEffect(() => {
    if (paused || n < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % n), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [paused, n]);

  // Counted once, the first time at least half the deck is on screen
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track("sample_card_viewed", {});
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!n) return null;
  const current = RESULTS[index];

  const open = (placement: "card" | "button") => {
    track("sample_card_clicked", { item_id: slugify(current.name), cooked_score: current.score, placement });
    goToSearch();
  };

  return (
    <div ref={rootRef} className="flex w-full max-w-sm flex-col items-center gap-2">
      <div
        role="group"
        aria-roledescription="carousel"
        aria-label="Real scan results"
        className="relative h-[244px] w-full touch-pan-y select-none"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY };
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const start = drag.current;
          drag.current = null;
          if (!start) return;
          const dx = e.clientX - start.x;
          if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
            swiped.current = true;
            setHeld(true);
            go(dx < 0 ? 1 : -1);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            setHeld(true);
            go(e.key === "ArrowRight" ? 1 : -1);
          }
        }}
      >
        {RESULTS.map((r, i) => {
          const s = slot(i, index, n);
          const middle = s === 0;
          const side = Math.abs(s) === 1;
          return (
            <button
              key={r.name}
              type="button"
              tabIndex={middle ? 0 : -1}
              aria-hidden={!middle}
              aria-label={middle ? `Real scan result: ${r.name}, ${r.score}% ${r.level}. Scan your own major` : undefined}
              onClick={() => {
                if (swiped.current) return; // the end of a swipe, not a tap
                setHeld(true);
                if (middle) open("card");
                else go(s);
              }}
              onFocus={() => setHovered(true)}
              onBlur={() => setHovered(false)}
              className={cn(
                "absolute inset-x-0 top-0 mx-auto w-[86%] rounded-3xl border bg-[#1A1A1A] p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/70",
                !reduceMotion && "transition-[transform,opacity,filter] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                middle ? "z-20 border-[#6B6B6B]/60 hover:border-[#6B6B6B]" : side ? "z-10 cursor-pointer border-[#303030]" : "pointer-events-none z-0 border-[#303030]"
              )}
              style={{
                // Side cards sit 78% of a card's width out, so about half of each shows; the hidden ones wait further out
                transform: `translateX(${s * (side ? 78 : 120)}%) scale(${middle ? 1 : 0.86}) rotate(${s * (side ? 4 : 8)}deg)`,
                opacity: middle || side ? 1 : 0,
                filter: middle ? "none" : "brightness(0.4)", // dimmed, not see-through, so overlapping cards never mix
              }}
            >
              <CardFace r={r} />
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5" aria-hidden>
        {RESULTS.map((r, i) => (
          <span key={r.name} className={cn("h-1.5 rounded-full transition-all", i === index ? "w-4 bg-[#FF6A00]" : "w-1.5 bg-[#303030]")} />
        ))}
      </div>

      <button
        type="button"
        onClick={() => open("button")}
        className="w-full rounded-full bg-[#FFE0C3] px-6 py-3.5 text-sm font-black uppercase tracking-widest text-[#0C0C0C] transition hover:bg-[#FFD3AB] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/70"
      >
        Scan yours, free
      </button>
    </div>
  );
}
