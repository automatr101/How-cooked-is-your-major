"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Sparkles, AlertTriangle, ArrowRight, BrainCircuit, Info } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { majors, Major, getLevelColor } from "@/lib/data";
import { AnimatedNumber } from "@/components/ui/animated-number";
import RetroGrid from "@/components/ui/retro-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import TypingAnimation from "@/components/ui/typing-animation";
import { cn } from "@/lib/utils";

import { Hero } from "@/components/hero";
import { ThemeToggle } from "@/components/theme-toggle";

import { toPng } from "html-to-image";

export default function Home() {
  const [query, setQuery] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (cardRef.current === null) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, backgroundColor: 'transparent' });
      const link = document.createElement('a');
      link.download = `cooked-${selectedMajor?.name.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('oops, something went wrong!', err);
    }
  };

  const filteredMajors = useMemo(() => {
    if (!query) return [];
    
    const searchTerms = query.toLowerCase().trim().split(/\s+/);
    if (searchTerms.length === 0) return [];

    return majors
      .map(major => {
        const name = major.name.toLowerCase();
        let score = 0;

        // Exact match gets highest priority
        if (name === query.toLowerCase().trim()) score = 100;
        // Starts with the full query
        else if (name.startsWith(query.toLowerCase().trim())) score = 80;
        // Contains the full query as a phrase
        else if (name.includes(query.toLowerCase().trim())) score = 60;
        // All keywords are present somewhere in the name
        else if (searchTerms.every(term => name.includes(term))) score = 40;
        
        return { major, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.major);
  }, [query]);

  const handleSelect = (major: Major) => {
    setSelectedMajor(major);
    setQuery("");
  };

  return (
    <main className="relative min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30 flex flex-col items-center pb-24 overflow-hidden font-sans">
      <ThemeToggle />
      {/* Interactive Hero */}
      <Hero />

      {/* Search Section */}
      <div id="search" className="w-full max-w-2xl mt-16 relative z-30 px-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
          <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden backdrop-blur-2xl transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 shadow-xl">
            <Search className="w-6 h-6 ml-6 text-muted-foreground transition-colors group-focus-within:text-primary" />
            <input
              type="text"
              className="w-full bg-transparent border-none text-xl text-foreground placeholder-muted-foreground/50 px-6 py-6 focus:outline-none focus:ring-0 font-bold tracking-tight"
              placeholder="Search 1,800+ courses..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selectedMajor) setSelectedMajor(null);
              }}
            />
          </div>
        </div>

        {/* Autocomplete Suggestions */}
        <AnimatePresence>
          {filteredMajors.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="absolute top-full left-0 right-0 mt-4 bg-card/80 backdrop-blur-3xl border border-border rounded-2xl overflow-hidden shadow-2xl z-50 p-2"
            >
              {filteredMajors.map((major) => (
                <button
                  key={major.name}
                  onClick={() => handleSelect(major)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted rounded-xl text-left transition-all group/item"
                >
                  <span className="text-foreground/80 group-hover/item:text-foreground font-bold transition-colors">{major.name}</span>
                  <div className="flex items-center gap-3">
                      <span className={cn(
                          "text-xs font-black px-2 py-1 rounded-md bg-background border border-border", 
                          major.score > 70 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                          {major.score}%
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/item:translate-x-1 group-hover/item:text-primary transition-all" />
                  </div>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result Section */}
      <AnimatePresence mode="wait">
        {selectedMajor && (
          <motion.div
            key={selectedMajor.name}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="w-full max-w-2xl mt-16 z-20 relative px-4"
          >
            {/* The Actual Downloadable Card */}
            <div ref={cardRef} className="p-4 bg-background rounded-[40px]">
              <div className={cn(
                  "relative rounded-[32px] border-4 border-foreground bg-card p-10 md:p-14 shadow-[20px_20px_0px_0px_rgba(0,0,0,0.1)] overflow-hidden transition-all duration-700",
              )}>
                {/* Branding on Card */}
                <div className="absolute top-8 left-10 flex items-center gap-2 opacity-40">
                  <BrainCircuit className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">cooked-major.vercel.app</span>
                </div>

                <div className="relative pt-6">
                  <div className="flex justify-between items-start mb-14">
                      <div className="max-w-[70%]">
                          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-3">Verification ID: #882-{selectedMajor.score}</p>
                          <h2 className="text-5xl md:text-6xl font-black text-foreground leading-[0.95] tracking-tighter uppercase break-words">{selectedMajor.name}</h2>
                      </div>
                      <div className={cn(
                          "p-4 rounded-3xl bg-foreground text-background",
                      )}>
                          <Sparkles className="w-10 h-10 fill-current" />
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-14">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em]">AI RISK LEVEL</p>
                      <div className="relative inline-flex items-baseline gap-1">
                        <span className={cn(
                            "text-9xl font-black tabular-nums tracking-tighter leading-none filter drop-shadow-[8px_8px_0px_rgba(0,0,0,0.1)]",
                            selectedMajor.score > 80 ? "text-destructive" : selectedMajor.score > 40 ? "text-orange-500" : "text-emerald-500"
                        )}>
                          <AnimatedNumber value={selectedMajor.score} />
                        </span>
                        <span className="text-4xl font-black opacity-30 select-none">%</span>
                        
                        {/* Decorative Background Element for Number */}
                        <div className="absolute -inset-4 bg-foreground/5 -z-10 rounded-3xl rotate-3 blur-2xl" />
                      </div>
                    </div>
                    
                    <div className="space-y-4 flex flex-col items-start">
                      <p className="text-[10px] font-black text-muted-foreground tracking-[0.3em]">SURVIVAL STATUS</p>
                      <div className="flex flex-col gap-4">
                          <span className={cn(
                              "text-5xl font-black tracking-tighter uppercase leading-none italic",
                              selectedMajor.score > 75 ? "text-destructive text-shadow-glow" : "text-foreground"
                          )}>
                              {selectedMajor.level}
                          </span>
                          
                          {/* The Marked Icon Refinement: High-Contrast Stamp Container */}
                          <div className={cn(
                              "relative flex items-center justify-center w-24 h-24 rounded-3xl border-4 border-foreground bg-background shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] rotate-[-6deg]",
                              selectedMajor.score > 80 ? "bg-destructive/10 border-destructive shadow-destructive/20" : 
                              selectedMajor.score > 60 ? "bg-orange-500/10 border-orange-500 shadow-orange-500/20" : ""
                          )}>
                              <span className="text-5xl select-none">
                                {selectedMajor.score > 80 ? '💀' : selectedMajor.score > 60 ? '🔥' : selectedMajor.score > 40 ? '🍳' : '🌱'}
                              </span>
                              
                              {/* Pulse Effect for High Risk Status Icons */}
                              {selectedMajor.score > 70 && (
                                <div className="absolute inset-0 rounded-2xl animate-ping bg-destructive/20 -z-10" />
                              )}
                          </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-10">
                    <div className="border-t-4 border-dashed border-foreground/10 pt-10">
                      <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-6">AI ROAST VERDICT</h3>
                      <p className="text-2xl md:text-3xl font-black italic text-foreground leading-tight tracking-tight">
                        "{selectedMajor.roast}"
                      </p>
                    </div>
                  </div>

                  {/* QR Code Placeholder / Aesthetic Branding */}
                  <div className="pt-10 border-t-2 border-foreground/5 flex justify-between items-end">
                    <div>
                      <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">DATA VERIFIED BY</p>
                      <p className="text-xs font-black">MAJORLABS INTELLIGENCE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] font-black text-muted-foreground uppercase mb-1">SCAN TO CHECK YOURS</p>
                      <p className="text-xs font-black">COOKED-MAJOR.VERCEL.APP</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions for User */}
            <div className="grid grid-cols-2 gap-4 mt-8 px-4">
              <button
                onClick={handleDownload}
                className="py-6 rounded-2xl bg-foreground text-background font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                <Info className="w-5 h-5" />
                SAVE CARD
              </button>
              <button
                onClick={() => {
                  const emoji = selectedMajor.score > 80 ? '💀' : selectedMajor.score > 60 ? '🔥' : '🍳';
                  const text = `I'm ${selectedMajor.level.toUpperCase()} ${emoji}\n\nMajor: ${selectedMajor.name}\nAI Risk: ${selectedMajor.score}%\n\nCheck yours: cooked-major.vercel.app`;
                  navigator.clipboard.writeText(text);
                  alert("Text copied! Ready to post 🫡");
                }}
                className="py-6 rounded-2xl bg-muted border border-border text-foreground font-black text-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
              >
                <Sparkles className="w-5 h-5 fill-current" />
                COPY TEXT
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="mt-auto pt-24 pb-12 text-center text-muted-foreground text-xs font-bold uppercase tracking-[0.3em] opacity-50">
          &copy; 2026 Copyright. by MajorLabs
      </footer>
    </main>
  );
}
