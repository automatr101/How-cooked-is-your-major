"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { realMajors, type Major } from "@/lib/data";

// "Choosing between majors?": pick two more majors to buy the Survival Plan for all three in one payment. Only real degrees
// can be picked, never the one already on screen and never the same one twice. The price is the server's (from /api/payments/status).

function search(query: string, exclude: string[]): Major[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return realMajors
    .filter((m) => !exclude.includes(m.name) && m.name.toLowerCase().includes(q))
    .sort((a, b) => Number(!a.name.toLowerCase().startsWith(q)) - Number(!b.name.toLowerCase().startsWith(q)) || a.name.length - b.name.length)
    .slice(0, 5);
}

function Slot({ label, value, exclude, onPick, onClear }: { label: string; value: Major | null; exclude: string[]; onPick: (m: Major) => void; onClear: () => void }) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => search(query, exclude), [query, exclude]);
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3">
        <span className="text-sm font-bold">{value.name}</span>
        <span className="flex items-center gap-2">
          <span className="text-xs font-black tabular-nums text-muted-foreground">{value.score}%</span>
          <button type="button" onClick={onClear} aria-label={`Remove ${value.name}`} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>
    );
  }
  return (
    <div className="relative">
      <label className="sr-only">{label}</label>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={label}
        aria-label={label}
        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      />
      {results.length > 0 && (
        <ul role="listbox" className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
          {results.map((m) => (
            <li key={m.name}>
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => {
                  onPick(m);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-muted"
              >
                <span className="font-bold">{m.name}</span>
                <span className="text-xs font-black tabular-nums text-muted-foreground">{m.score}%</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function BundlePicker({ current, priceLabel, onContinue, onCancel }: { current: Major; priceLabel: string; onContinue: (majors: Major[]) => void; onCancel: () => void }) {
  const [second, setSecond] = useState<Major | null>(null);
  const [third, setThird] = useState<Major | null>(null);
  const taken = [current.name, second?.name, third?.name].filter(Boolean) as string[];
  return (
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-background/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase">3 majors, one payment</p>
          <p className="text-xs text-muted-foreground">
            {current.name} plus two more, {priceLabel} for all three.
          </p>
        </div>
        <button type="button" onClick={onCancel} aria-label="Close" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <Slot label="Add a second major" value={second} exclude={taken} onPick={setSecond} onClear={() => setSecond(null)} />
      <Slot label="Add a third major" value={third} exclude={taken} onPick={setThird} onClear={() => setThird(null)} />
      <button
        type="button"
        disabled={!second || !third}
        onClick={() => second && third && onContinue([current, second, third])}
        className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground transition enabled:hover:scale-[1.02] disabled:opacity-40"
      >
        Get all 3 for {priceLabel}
      </button>
    </div>
  );
}
