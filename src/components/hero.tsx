"use client";

import React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Plus, BrainCircuit, Sparkles } from "lucide-react"; 
import { Button } from "@/components/ui/button"; 
import { majors } from "@/lib/data";
import { ShineBorder } from "@/components/ui/hero-designali";
import { TypeWriter } from "@/components/ui/hero-designali";
import { cn } from "@/lib/utils";

// Three.js is ~140 KB gzipped and purely decorative, so load it after the hero text is interactive.
const GLSLHills = dynamic(
  () => import("@/components/ui/glsl-hills").then((m) => m.GLSLHills),
  { ssr: false }
);

// Cartoon avatars from the public-domain (CC0) "Notionists" set by Zoish, generated once and kept in /public/avatars.
const AVATARS = ["/avatars/avatar-1.svg", "/avatars/avatar-2.svg", "/avatars/avatar-3.svg", "/avatars/avatar-4.svg", "/avatars/avatar-5.svg"];

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

export const Hero = () => {
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
    <main className="relative w-full min-h-[90vh] flex flex-col items-center justify-center overflow-hidden">
      {/* 3D GLSL Hills Background */}
      <GLSLHills speed={0.4} cameraZ={140} />
      
      {/* Overlay Glow */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-background to-transparent z-10 pointer-events-none" />

      <div className="max-w-6xl w-full relative z-20 px-6">
        <div className="flex flex-col items-center justify-center text-center space-y-10">
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background/30 border border-border backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl">
              <BrainCircuit className="w-3 h-3 text-primary" />
              Intelligence Vector V.04
            </div>

            <h1 className="text-7xl md:text-9xl font-black tracking-tighter leading-[0.85] text-foreground">
              <span className="italic font-thin text-5xl md:text-7xl block mb-4 opacity-70">How </span>
              Cooked <br />
              Is Your <span className="bg-gradient-to-r from-primary via-destructive to-secondary bg-clip-text text-transparent italic tracking-tighter">Major?</span>
            </h1>
          </div>

          <div className="relative group max-w-2xl">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-card/60 border border-border px-8 py-10 rounded-3xl backdrop-blur-2xl">
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

          {/* Illustrated avatars (public domain, shipped with the site) are decoration, not photos of users; the number is a true one, from the data */}
          <div className="flex flex-col sm:flex-row items-center gap-8 pt-6">
            <div className="flex flex-col items-start gap-2">
              <div className="flex -space-x-3" aria-hidden="true">
                {AVATARS.map((src) => (
                  <div key={src} className="w-12 h-12 rounded-full border-2 border-background bg-muted flex items-center justify-center overflow-hidden shadow-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element -- tiny static SVGs, nothing to optimise */}
                    <img src={src} alt="" width={48} height={48} decoding="async" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">
                <span className="text-foreground">{majors.length.toLocaleString("en-US")}</span> majors scored
              </p>
            </div>
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
