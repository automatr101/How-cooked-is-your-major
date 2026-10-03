"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Search, X, Zap } from "lucide-react";
import { majors } from "@/lib/data";
import { cn } from "@/lib/utils";

const PAGE = 10;

// Page numbers to show: always the first and last, and the pages around the current one, with gaps as null.
function pageList(current: number, total: number): (number | null)[] {
  const keep = new Set([1, total, current - 1, current, current + 1]);
  const out: (number | null)[] = [];
  let last = 0;
  for (let p = 1; p <= total; p++) {
    if (!keep.has(p)) continue;
    if (p - last > 1) out.push(null);
    out.push(p);
    last = p;
  }
  return out;
}

function tone(score: number) {
  return score > 66
    ? { label: "Fully cooked", text: "text-destructive", bar: "bg-destructive", badge: "bg-destructive/10 text-destructive border-destructive/20" }
    : score > 33
    ? { label: "Kinda cooked", text: "text-orange-500", bar: "bg-orange-500", badge: "bg-orange-500/10 text-orange-500 border-orange-500/20" }
    : { label: "Not cooked", text: "text-emerald-500", bar: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" };
}

export default function LeaderboardPage() {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  // Ranked by risk score; ties put the shorter name first. The rank stays put while filtering.
  const ranked = useMemo(
    () =>
      [...majors]
        .sort((a, b) => b.score - a.score || a.name.length - b.name.length)
        .slice(0, 100)
        .map((m, i) => ({ ...m, rank: i + 1 })),
    []
  );

  const q = query.trim().toLowerCase();
  const rows = useMemo(() => (q ? ranked.filter((m) => m.name.toLowerCase().includes(q)) : ranked), [ranked, q]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const current = Math.min(page, pages);
  const visible = rows.slice((current - 1) * PAGE, current * PAGE);
  const goTo = (p: number) => {
    setPage(p);
    document.getElementById("leaderboard-list")?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground font-sans px-4 pt-6 sm:p-6 md:p-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-8 md:space-y-12">
        {/* Header */}
        <div className="flex flex-col gap-6">
          <div className="space-y-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Return Home
            </Link>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">
              Major <br />
              <span className="text-primary underline decoration-destructive decoration-wavy underline-offset-4">Leaderboard</span>
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              The <span className="text-foreground font-black">100 most cooked</span> majors, ranked by AI risk score. Tap one to see its full scan.
            </p>
          </div>

        </div>

        {/* Filter */}
        <div className="relative flex items-center bg-card border border-border rounded-2xl shadow-xl focus-within:border-primary/50 transition-colors">
          <Search aria-hidden className="w-5 h-5 ml-4 shrink-0 text-muted-foreground" />
          <input
            type="search"
            aria-label="Filter the leaderboard by major name"
            placeholder="Filter the top 100..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            className="w-full min-w-0 bg-transparent border-none text-lg font-bold text-foreground placeholder-muted-foreground/50 px-4 py-4 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => {
                setQuery("");
                setPage(1);
              }}
              className="mr-3 grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* List */}
        <div id="leaderboard-list" className="scroll-mt-24 bg-card/40 border border-border/50 rounded-3xl md:rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
          <div className="hidden sm:grid grid-cols-[4rem_1fr_6rem_9rem] items-center gap-4 px-8 py-5 bg-muted/30 border-b border-border/10 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            <span>Rank</span>
            <span>Major</span>
            <span>Risk</span>
            <span>Status</span>
          </div>

          <p role="status" className="sr-only">
            {q ? `${rows.length} ${rows.length === 1 ? "major matches" : "majors match"} “${query.trim()}”` : ""}
          </p>

          {rows.length === 0 ? (
            <p className="px-6 py-12 text-center text-sm font-bold text-muted-foreground">
              No major in the top 100 matches “{query.trim()}”. Try fewer letters, or search for it on the{" "}
              <Link href="/" className="text-primary underline">home page</Link>.
            </p>
          ) : (
            <ol>
              {visible.map((m) => {
                const t = tone(m.score);
                return (
                  <li key={m.name} className="border-b border-border/5 last:border-b-0">
                    <Link
                      href={`/?major=${encodeURIComponent(m.name)}`}
                      className="grid grid-cols-[2.5rem_1fr_auto] sm:grid-cols-[4rem_1fr_6rem_9rem] items-center gap-x-3 sm:gap-x-4 gap-y-2 px-4 sm:px-8 py-4 sm:py-5 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none transition-colors group"
                    >
                      <span className="font-mono font-black italic text-sm sm:text-base opacity-40 group-hover:opacity-100 transition-opacity">
                        #{m.rank}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm sm:text-base font-black uppercase tracking-tight leading-tight break-words">
                          {m.name}
                        </span>
                        <span className="sm:hidden mt-2 flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border", t.badge)}>
                            {t.label}
                          </span>
                        </span>
                      </span>
                      <span className="text-right sm:contents">
                        <span className="block sm:hidden text-xl font-black tabular-nums" style={{ lineHeight: 1 }}>
                          <span className={t.text}>{m.score}%</span>
                        </span>
                        <span className="hidden sm:block text-left">
                          <span className={cn("block text-xl font-black tabular-nums", t.text)}>{m.score}%</span>
                          <span aria-hidden className="mt-1.5 block h-1 w-full rounded-full bg-muted overflow-hidden">
                            <span className={cn("block h-full rounded-full", t.bar)} style={{ width: `${m.score}%` }} />
                          </span>
                        </span>
                        <span className="hidden sm:block text-left">
                          <span className={cn("inline-block px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border whitespace-nowrap", t.badge)}>
                            {t.label}
                          </span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}

          {pages > 1 && (
            <nav aria-label="Leaderboard pages" className="flex flex-col items-center gap-3 p-4 sm:p-6 border-t border-border/10">
              <ul className="flex flex-wrap items-center justify-center gap-1.5">
                <li>
                  <button
                    type="button"
                    aria-label="Previous page"
                    disabled={current === 1}
                    onClick={() => goTo(current - 1)}
                    className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </li>
                {pageList(current, pages).map((p, i) =>
                  p === null ? (
                    <li key={"gap" + i} aria-hidden className="grid h-10 w-6 place-items-center text-muted-foreground">…</li>
                  ) : (
                    <li key={p}>
                      <button
                        type="button"
                        aria-label={"Page " + p}
                        aria-current={p === current ? "page" : undefined}
                        onClick={() => goTo(p)}
                        className={cn(
                          "grid h-10 min-w-10 px-2 place-items-center rounded-xl text-sm font-black tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                          p === current ? "bg-primary text-background shadow-lg" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {p}
                      </button>
                    </li>
                  )
                )}
                <li>
                  <button
                    type="button"
                    aria-label="Next page"
                    disabled={current === pages}
                    onClick={() => goTo(current + 1)}
                    className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </li>
              </ul>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                {(current - 1) * PAGE + 1}–{Math.min(current * PAGE, rows.length)} of {rows.length}
              </p>
            </nav>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center p-8 sm:p-12 bg-primary rounded-3xl md:rounded-[40px] text-background text-center space-y-6 shadow-[0_20px_50px_rgba(255,224,194,0.15)]">
          <Zap className="w-12 h-12 fill-current" />
          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter italic">Is your degree next?</h2>
            <p className="font-bold uppercase tracking-widest opacity-80 text-xs">Don&apos;t wait until graduation to find out you&apos;re redundant.</p>
          </div>
          <Link href="/" className="inline-flex items-center gap-3 bg-background text-foreground px-8 py-4 rounded-2xl font-black uppercase text-sm hover:scale-[1.05] active:scale-95 transition-all">
            Scan Your Major
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <footer className="mt-24 text-center text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
        MajorLabs Intelligence Vector v.04
      </footer>
    </main>
  );
}
