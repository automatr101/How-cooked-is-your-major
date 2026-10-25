"use client";

import React from "react";
import dynamic from "next/dynamic";
import { Plus, BrainCircuit } from "lucide-react";
import { MONTHLY_VISITORS } from "@/content/stats";
import { TypeWriter } from "@/components/ui/hero-designali";
import { cn } from "@/lib/utils";
import { FriendsRow } from "@/components/friends-row";
import { SampleResultCard } from "@/components/sample-result-card";
import type { ExperimentView } from "@/lib/unlock/shared";

// Three.js is ~140 KB gzipped and purely decorative, so load it after the hero text is interactive.
const GLSLHills = dynamic(
  () => import("@/components/ui/glsl-hills").then((m) => m.GLSLHills),
  { ssr: false }
);

// The hero sentence is typed out one letter at a time, so its length (and the number of lines it wraps to) keeps
// changing. On phones that made the card grow and shrink by a line and nudged the whole page up and down. Every
// course name is also laid out, invisible, in the same grid cell as the live sentence, so the cell is always as big
// as the biggest of them and nothing moves while the typing runs.
const SENTENCE_CLASS = "col-start-1 row-start-1 text-xl md:text-2xl text-muted-foreground font-medium";

const sentence = (typed: React.ReactNode) => (
  <>
    Find out how <span className="text-foreground font-black italic">cooked</span> your major is before graduation. <br className="hidden md:block" />
    Analyzing <span className="text-foreground font-black underline decoration-primary/50 underline-offset-8">{typed}</span> with cold, hard AI logic.
  </>
);

export const Hero = ({ experiment = null }: { experiment?: ExperimentView | null }) => {
  const talkAbout = [
    "Computer Science",
    "Digital Marketing",
    "Graphic Design",
    "Architecture",
    "Nursing",
    "Accounting",
    "Law",
  ];

  return (
    <main className="relative w-full min-h-[90vh] flex flex-col items-center justify-start sm:justify-center overflow-hidden pt-4 sm:pt-0">
      {/* 3D GLSL Hills Background */}
      <GLSLHills speed={0.4} cameraZ={140} />
      
      {/* Overlay Glow */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

      <div className="max-w-6xl w-full relative z-20 px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-5 sm:space-y-6">
          
          <div className="space-y-3 sm:space-y-4">
            <div className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/30 border border-border backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl">
              <BrainCircuit className="w-3 h-3 text-primary" />
              Intelligence Vector V.04
            </div>

            <h1 className="text-6xl sm:text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] text-foreground">
              <span className="italic font-thin text-4xl sm:text-5xl md:text-7xl block mb-2 opacity-70">How </span>
              Cooked <br />
              Is Your <span className="bg-gradient-to-r from-primary via-destructive to-secondary bg-clip-text text-transparent italic tracking-tighter">Major?</span>
            </h1>
          </div>

          {/* Phones: one short line instead of the typing card, so the sample result and its button fit above the fold */}
          <p className="sm:hidden text-base text-muted-foreground font-medium">{experiment ? "AI-risk score for any degree. Here's a real one:" : <>Free AI-risk score for any degree. Here&apos;s a real one:</>}</p>

          <div className="relative group max-w-2xl hidden sm:block">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-card/60 border border-border px-8 py-4 rounded-3xl backdrop-blur-2xl">
              <div className="grid">
                <p className={SENTENCE_CLASS}>{sentence(<TypeWriter strings={talkAbout} />)}</p>
                {/* Invisible copies that only reserve room (see above); the "|" stands in for the typing cursor */}
                {talkAbout.map((name) => (
                  <p key={name} aria-hidden="true" className={cn(SENTENCE_CLASS, "invisible select-none")}>
                    {sentence(`${name}|`)}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* A real result cycling through five confirmed scans, the button to scan your own right under it, and the real monthly visitor count (src/content/stats.ts) */}
          <div className="flex w-full flex-col items-center gap-3 sm:pt-2">
            <SampleResultCard buttonLabel={experiment ? "Scan yours" : undefined} />
            <FriendsRow />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
              <span className="text-foreground">{MONTHLY_VISITORS.display}</span> {MONTHLY_VISITORS.label}
            </p>
          </div>

          {/* Plus decorations */}
          <Plus strokeWidth={8} className="text-primary absolute left-0 top-0 h-12 w-12 opacity-20 -translate-x-1/2 -translate-y-1/2" />
          <Plus strokeWidth={8} className="text-secondary absolute right-0 top-0 h-12 w-12 opacity-20 translate-x-1/2 -translate-y-1/2" />
          <Plus strokeWidth={8} className="text-destructive absolute left-0 bottom-0 h-12 w-12 opacity-20 -translate-x-1/2 translate-y-1/2" />
          <Plus strokeWidth={8} className="text-primary absolute right-0 bottom-0 h-12 w-12 opacity-20 translate-x-1/2 translate-y-1/2" />
        </div>
      </div>
    </main>
  );
};
