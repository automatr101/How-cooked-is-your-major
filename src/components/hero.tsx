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
              <p className="text-xl md:text-2xl text-muted-foreground font-medium">
                Find out how <span className="text-foreground font-black italic">cooked</span> your major is before graduation. <br className="hidden md:block" />
                Analyzing <span className="text-foreground font-black underline decoration-primary/50 underline-offset-8">
                  <TypeWriter strings={talkAbout} />
                </span> with cold, hard AI logic.
              </p>
            </div>
          </div>

          {/* A true number, from the data: how many majors have a score */}
          <p className="pt-6 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <span className="text-foreground">{majors.length.toLocaleString("en-US")}</span> majors scored
          </p>

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
