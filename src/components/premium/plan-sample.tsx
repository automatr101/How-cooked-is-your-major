"use client";

import { useEffect, useState } from "react";
import { Check, Lock } from "lucide-react";
import { majors } from "@/lib/data";
import { PAYMENTS_MODE } from "@/lib/premium";
import type { PlanPreview } from "@/lib/plan/preview";
import { insideList } from "./premium-offer";

// "What's in the plan" on the home page, with a REAL sample: the plan for Computer Science, produced by the same
// code a buyer's plan comes from (via /api/plan/preview), showing two of its recommendations and counts of the rest. It
// is labelled as a sample for that major, it only shows before a scan, and it renders nothing if payments are off or the
// sample cannot be loaded.

const SAMPLE_MAJOR = "Computer Science";

export function PlanSample() {
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  useEffect(() => {
    if (PAYMENTS_MODE === "off") return;
    let live = true;
    fetch(`/api/plan/preview?major=${encodeURIComponent(SAMPLE_MAJOR)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { preview?: PlanPreview } | null) => live && d?.preview && setPreview(d.preview))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  if (!preview) return null;
  const sample = majors.find((m) => m.name === SAMPLE_MAJOR);
  const hidden = preview.counts.careerPaths - preview.visible.length;

  return (
    <section aria-labelledby="plan-sample-title" className="relative z-20 mt-4 w-full max-w-3xl px-6">
      <div className="rounded-3xl border border-border bg-card/60 p-6 backdrop-blur-xl sm:p-8">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">The optional career plan</p>
        <h2 id="plan-sample-title" className="mt-1 text-2xl font-black italic uppercase leading-[0.95] tracking-tighter sm:text-3xl">
          What&apos;s in the plan
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The scan is free. After it, you can unlock a plan written for your major. This is a real sample, made the same way yours would be.
        </p>

        <ul className="mt-5 space-y-2">
          {insideList(preview, []).map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm font-bold">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 rounded-2xl border border-border/60 bg-background/50 p-4">
          <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Sample plan: {SAMPLE_MAJOR}
            {sample ? ` (${sample.score}%, ${sample.level})` : ""}
          </p>
          <ul className="space-y-3">
            {preview.visible.map((item) => (
              <li key={item.title}>
                <p className="text-sm font-black leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.why}</p>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <div className="mt-3 space-y-2">
              {Array.from({ length: Math.min(3, hidden) }).map((_, i) => (
                <div key={i} aria-hidden className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <div className="h-3 rounded-full bg-muted-foreground/20 blur-[1.5px]" style={{ width: `${84 - i * 17}%` }} />
                </div>
              ))}
              <p className="text-[11px] font-bold text-muted-foreground">+ {hidden} more career paths and the rest of the plan unlock after payment.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
