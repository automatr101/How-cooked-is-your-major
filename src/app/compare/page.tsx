"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, BrainCircuit, Zap, ArrowLeft, GitCompare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { majors, Major } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function ComparePage() {
  const [query1, setQuery1] = useState("");
  const [query2, setQuery2] = useState("");
  const [major1, setMajor1] = useState<Major | null>(null);
  const [major2, setMajor2] = useState<Major | null>(null);

  const filter = (query: string) => {
    if (!query) return [];
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    return majors
      .map(major => {
        const name = major.name.toLowerCase();
        let score = 0;
        if (name === query.toLowerCase().trim()) score = 100;
        else if (name.startsWith(query.toLowerCase().trim())) score = 80;
        else if (name.includes(query.toLowerCase().trim())) score = 60;
        else if (searchTerms.every(term => name.includes(term))) score = 40;
        return { major, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.major);
  };

  const filtered1 = useMemo(() => filter(query1), [query1]);
  const filtered2 = useMemo(() => filter(query2), [query2]);

  return (
    <main className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 pb-24">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="space-y-4 text-center md:text-left">
          <Link 
            href="/" 
            className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Return Home
          </Link>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-[0.8]">
            Career <br />
            <span className="text-primary underline decoration-emerald-500 decoration-wavy underline-offset-4">Comparison</span>
          </h1>
          <p className="text-muted-foreground font-medium text-lg max-w-xl mx-auto md:mx-0">
            Compare two degree paths side-by-side to find the <span className="text-foreground font-black">safest route</span> through the AI revolution.
          </p>
        </div>

        {/* Search Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative">
           {/* Center Icon */}
           <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 hidden md:flex w-12 h-12 rounded-full bg-background border border-border items-center justify-center">
              <GitCompare className="w-6 h-6 text-primary" />
           </div>

           {/* Slot 1 */}
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">PRIMARY MAJOR</p>
              <div className="relative group">
                <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden focus-within:border-primary/50 transition-all shadow-xl">
                  <Search className="w-5 h-5 ml-4 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full bg-transparent border-none text-lg text-foreground px-4 py-5 focus:outline-none font-bold"
                    placeholder="Search major..."
                    value={major1 ? major1.name : query1}
                    onChange={(e) => {
                        setQuery1(e.target.value);
                        if (major1) setMajor1(null);
                    }}
                  />
                </div>
                <AnimatePresence>
                  {filtered1.length > 0 && (
                    <motion.div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl">
                      {filtered1.map(m => (
                        <button key={m.name} onClick={() => {setMajor1(m); setQuery1("")}} className="w-full p-4 hover:bg-muted text-left font-bold text-sm">
                          {m.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </div>

           {/* Slot 2 */}
           <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">COMPARISON MAJOR</p>
              <div className="relative group">
                <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden focus-within:border-primary/50 transition-all shadow-xl">
                  <Search className="w-5 h-5 ml-4 text-muted-foreground" />
                  <input
                    type="text"
                    className="w-full bg-transparent border-none text-lg text-foreground px-4 py-5 focus:outline-none font-bold"
                    placeholder="Search major..."
                    value={major2 ? major2.name : query2}
                    onChange={(e) => {
                        setQuery2(e.target.value);
                        if (major2) setMajor2(null);
                    }}
                  />
                </div>
                <AnimatePresence>
                  {filtered2.length > 0 && (
                    <motion.div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl">
                      {filtered2.map(m => (
                        <button key={m.name} onClick={() => {setMajor2(m); setQuery2("")}} className="w-full p-4 hover:bg-muted text-left font-bold text-sm">
                          {m.name}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </div>

        {/* Results View */}
        <AnimatePresence>
          {major1 && major2 && (
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12"
            >
              {[major1, major2].map((m, idx) => {
                const other = idx === 0 ? major2 : major1;
                const isMoreAtRisk = m.score > other.score;
                return (
                  <div key={idx} className={cn(
                    "rounded-[40px] p-8 sm:p-12 relative overflow-hidden transition-all duration-500",
                    isMoreAtRisk ? "bg-destructive/5 border-4 border-destructive/20" : "bg-emerald-500/5 border-4 border-emerald-500/20"
                  )}>
                    <div className="flex justify-between items-start mb-8">
                      <span className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase",
                        isMoreAtRisk ? "bg-destructive text-white" : "bg-emerald-500 text-white"
                      )}>
                        {isMoreAtRisk ? "MORE AT RISK" : "SAFER CHOICE"}
                      </span>
                      <BrainCircuit className="w-8 h-8 opacity-20" />
                    </div>

                    <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tighter leading-none mb-6 line-clamp-2">
                        {m.name}
                    </h2>

                    <div className="flex items-baseline gap-2 mb-8">
                       <span className={cn(
                         "text-7xl sm:text-8xl font-black tracking-tighter",
                         m.score > 70 ? "text-destructive" : m.score > 40 ? "text-orange-500" : "text-emerald-500"
                       )}>
                         {m.score}%
                       </span>
                       <span className="text-xs font-black uppercase text-muted-foreground tracking-widest">{m.level}</span>
                    </div>

                    <div className="space-y-6 pt-8 border-t border-border/10">
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground tracking-widest mb-1 uppercase">SALARY RANGE</p>
                            <p className="text-lg font-black">{m.salary}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-muted-foreground tracking-widest mb-1 uppercase">MARKET GROWTH</p>
                            <p className={cn("text-lg font-black", m.growth.includes('-') ? "text-destructive" : "text-emerald-500")}>
                                {m.growth}
                            </p>
                          </div>
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-muted-foreground tracking-widest mb-2 uppercase">AI ROAST</p>
                          <p className="text-xl font-black italic text-foreground leading-tight">"{m.roast}"</p>
                       </div>
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        {(!major1 || !major2) && (
            <div className="py-24 border-2 border-dashed border-border/50 rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
                <Zap className="w-12 h-12 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground font-bold uppercase tracking-widest text-xs">select two majors to generate analytics</p>
            </div>
        )}

      </div>
    </main>
  );
}
