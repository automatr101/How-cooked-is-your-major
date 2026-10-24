"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { majors } from "@/lib/data";
import { track, slugify } from "@/lib/analytics";
import { cn } from "@/lib/utils";

// A real result in the hero, so visitors see what a scan gives them before they type anything. Only these five confirmed
// scans are used, and the score and verdict come straight from the site's data (never typed in here), so the card can never
// disagree with what a real scan of the same major shows. The roast lines are about the degree, never the person.

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

/** Score bands: 0-39 green, 40-69 amber, 70-100 red. */
const band = (score: number) => (score >= 70 ? "#E54D2E" : score >= 40 ? "#FF6D00" : "#00BC7D");

const ROTATE_MS = 3000;

/** Glide to the search box and focus it (empty: nothing is prefilled). */
export function goToSearch() {
  const target = document.getElementById("search");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
  window.setTimeout(() => target?.querySelector("input")?.focus({ preventScroll: true }), reduce ? 0 : 400);
}

export function SampleResultCard() {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const paused = hovered || tapped || !!reduceMotion;

  useEffect(() => {
    if (paused || RESULTS.length < 2) return;
    const t = window.setInterval(() => setIndex((i) => (i + 1) % RESULTS.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [paused]);

  // Counted once, the first time at least half the card is on screen
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

  if (!RESULTS.length) return null;
  const r = RESULTS[reduceMotion ? 0 : index];
  const color = band(r.score);

  const open = (placement: "card" | "button") => {
    track("sample_card_clicked", { item_id: slugify(r.name), cooked_score: r.score, placement });
    goToSearch();
  };

  return (
    <div ref={rootRef} className="flex w-full max-w-sm flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => {
          setTapped(true);
          open("card");
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        aria-label={`Real scan result: ${r.name}, ${r.score}% ${r.level}. Scan your own major`}
        className="group relative w-full rounded-3xl border border-[#303030] bg-[#1A1A1A] p-5 text-left transition-colors hover:border-[#6B6B6B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6A00]/70"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full border border-[#303030] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-[#A6A6A6]">Real scan result</span>
          <span aria-hidden className="flex gap-1">
            {RESULTS.map((x, i) => (
              <span key={x.name} className={cn("h-1.5 w-1.5 rounded-full transition-colors", i === (reduceMotion ? 0 : index) ? "bg-[#FF6A00]" : "bg-[#303030]")} />
            ))}
          </span>
        </div>

        {/* Fixed heights below, so switching majors never changes the card's size */}
        <div aria-hidden className="relative mt-4 h-[152px]">
          <div key={r.name} className="sample-fade-in absolute inset-0 flex flex-col">
              <p className="truncate text-sm font-bold text-[#F4F4F4]">{r.name}</p>
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
              <p className="mt-3 line-clamp-2 text-sm italic leading-snug text-[#A6A6A6]">&ldquo;{r.line}&rdquo;</p>
          </div>
        </div>
      </button>

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
