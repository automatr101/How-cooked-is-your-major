"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Info, Twitter, MessageCircle, ArrowRight, BrainCircuit, Sparkles, ChevronRight, LayoutGrid, Zap } from "lucide-react";
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

export default function HomeClient() {
  const [query, setQuery] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Auto-select from URL params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const majorName = params.get("major");
      if (majorName && !selectedMajor) {
        const found = majors.find(m => m.name === majorName);
        if (found) {
            setSelectedMajor(found);
            setTimeout(() => {
                document.getElementById("result")?.scrollIntoView({ behavior: 'smooth' });
            }, 500);
        }
      }
    }
  }, []);

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

  const handleSelect = (major: Major) => {
    setQuery("");
    setIsScanning(true);
    // Dramatic delay for the scan
    setTimeout(() => {
      setSelectedMajor(major);
      setIsScanning(false);
      // Scroll to result after a tiny beat
      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, 2000);
  };

  const handleShare = (platform: 'x' | 'wa') => {
    if (!selectedMajor) return;
    const emoji = selectedMajor.score > 80 ? '💀' : selectedMajor.score > 60 ? '🔥' : '🍳';
    
    // Create a dynamic URL with params to trigger dynamic OG image
    const baseUrl = "https://cooked-major.vercel.app";
    const shareUrl = `${baseUrl}?major=${encodeURIComponent(selectedMajor.name)}&score=${selectedMajor.score}&level=${encodeURIComponent(selectedMajor.level)}`;
    
    const text = `I'm ${selectedMajor.level.toUpperCase()} ${emoji}\n\nMajor: ${selectedMajor.name}\nAI Risk: ${selectedMajor.score}%\n\nCheck yours: ${shareUrl}`;
    
    if (platform === 'x') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
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


  return (
    <main className="relative min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30 flex flex-col items-center pb-24 overflow-hidden font-sans">
      <ThemeToggle />
      {/* Interactive Hero */}
      <Hero />

      {/* Scanning Overlay */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <div className="w-full max-w-md space-y-8 text-center">
              <div className="relative inline-block">
                <BrainCircuit className="w-24 h-24 text-primary animate-pulse" />
                <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse -z-10" />
              </div>
              <div className="space-y-2">
                  <h2 className="text-3xl font-black tracking-tighter uppercase italic">Scanning Your Future...</h2>
                  <p className="text-muted-foreground font-mono text-sm uppercase tracking-widest">Running Simulation v4.0.2...</p>
              </div>
              <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                  <motion.div 
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: 2, ease: "easeInOut" }}
                      className="h-full bg-primary"
                  />
              </div>
              <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">Analyzing market trends & AI growth models</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            id="result"
          >
            {/* The Actual Downloadable Card - Optimized for IG 4:5 Ratio */}
            <div ref={cardRef} className="p-1 sm:p-2 bg-background rounded-[40px]">
              <div className={cn(
                  "relative rounded-[32px] border-4 border-foreground bg-card p-4 sm:p-8 md:p-10 shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] transition-all duration-700 flex flex-col justify-between aspect-[4/5] overflow-visible",
              )}>
                {/* Branding on Card */}
                <div className="absolute top-6 left-8 flex items-center gap-2 opacity-30">
                  <BrainCircuit className="w-3 h-3" />
                  <span className="text-[8px] font-black uppercase tracking-widest">cooked-major.vercel.app</span>
                </div>

                <div className="relative pt-4 flex-1 flex flex-col min-h-0">
                  {/* Top Header Area */}
                  <div className="flex justify-between items-start mb-3 sm:mb-6">
                      <div className="max-w-[80%]">
                          <p className="text-[6px] sm:text-[8px] font-black uppercase tracking-[0.4em] text-muted-foreground mb-1">Verification ID: #882-{selectedMajor.score}</p>
                          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-foreground leading-[0.9] tracking-tighter uppercase break-words line-clamp-2 sm:line-clamp-3">{selectedMajor.name}</h2>
                      </div>
                      <div className={cn(
                          "p-1 sm:p-3 rounded-lg sm:xl bg-foreground text-background shrink-0",
                      )}>
                          <Sparkles className="w-4 h-4 sm:w-8 sm:h-8 fill-current" />
                      </div>
                  </div>

                  {/* Split Dashboard Area */}
                  <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-foreground/5">
                    <div className="space-y-1">
                      <p className="text-[7px] font-black text-muted-foreground tracking-[0.3em]">AI RISK LEVEL</p>
                      <div className="relative inline-flex items-baseline gap-1">
                        <span className={cn(
                            "text-5xl sm:text-6xl md:text-7xl font-black tabular-nums tracking-tighter leading-none filter drop-shadow-[4px_4px_0px_rgba(0,0,0,0.1)]",
                            selectedMajor.score > 80 ? "text-destructive" : selectedMajor.score > 40 ? "text-orange-500" : "text-emerald-500"
                        )}>
                          <AnimatedNumber value={selectedMajor.score} />
                        </span>
                        <span className="text-xl font-black opacity-30 select-none">%</span>
                      </div>
                    </div>
                    
                    <div className="space-y-1 flex flex-col items-start pl-4 border-l border-foreground/5">
                      <p className="text-[7px] font-black text-muted-foreground tracking-[0.3em]">SURVIVAL STATUS</p>
                      <div className="flex flex-col gap-1">
                          <span className={cn(
                              "text-xl sm:text-2xl md:text-3xl font-black tracking-tighter uppercase leading-none italic",
                              selectedMajor.score > 75 ? "text-destructive text-shadow-glow" : "text-foreground"
                          )}>
                              {selectedMajor.level}
                          </span>
                      </div>
                    </div>
                  </div>

                  {/* Market Stats Dashboard */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-3 sm:mb-6 pt-2 sm:pt-4 border-t border-foreground/5">
                    <div className="space-y-0.5 sm:space-y-1">
                      <p className="text-[6px] sm:text-[7px] font-black text-muted-foreground tracking-[0.3em]">SALARY RANGE</p>
                      <p className="text-base sm:text-xl font-black tabular-nums tracking-tighter text-foreground">
                        {selectedMajor.salary}
                      </p>
                    </div>
                    
                    <div className="space-y-0.5 sm:space-y-1 pl-2 sm:pl-4 border-l border-foreground/5">
                      <p className="text-[6px] sm:text-[7px] font-black text-muted-foreground tracking-[0.3em]">MARKET GROWTH</p>
                      <p className={cn(
                        "text-base sm:text-xl font-black tabular-nums tracking-tighter",
                        selectedMajor.growth.includes('-') ? "text-destructive" : "text-emerald-500"
                      )}>
                        {selectedMajor.growth}
                      </p>
                    </div>
                  </div>
                       {/* Roast Verdict Area */}
                  <div className="flex-1 flex flex-col justify-center py-2 sm:py-4 border-t-2 border-dashed border-foreground/10">
                    <h3 className="text-[6px] sm:text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 sm:mb-3">AI ROAST VERDICT</h3>
                    <p className="text-lg sm:text-2xl md:text-3xl font-black italic text-foreground leading-tight tracking-tight line-clamp-4">
                        "{selectedMajor.roast}"
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-6 mt-4 border-t border-foreground/5 flex justify-between items-end">
                    <div>
                      <p className="text-[7px] font-black text-muted-foreground uppercase mb-1">DATA VERIFIED BY</p>
                      <p className="text-[10px] font-black">MAJORLABS INTELLIGENCE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[7px] font-black text-muted-foreground uppercase mb-1">SCAN TO CHECK YOURS</p>
                      <p className="text-[10px] font-black">COOKED-MAJOR.VERCEL.APP</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions for User */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 px-4">
              <button
                onClick={() => handleShare('x')}
                className="py-4 rounded-2xl bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                <Twitter className="w-4 h-4 fill-current" />
                SHARE ON X
              </button>
              <button
                onClick={() => handleShare('wa')}
                className="py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                WHATSAPP
              </button>
              <button
                onClick={handleDownload}
                className="py-4 rounded-2xl bg-foreground text-background font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                <Info className="w-4 h-4" />
                SAVE CARD
              </button>
              <button
                onClick={() => {
                  const emoji = selectedMajor.score > 80 ? '💀' : selectedMajor.score > 60 ? '🔥' : '🍳';
                  const text = `I'm ${selectedMajor.level.toUpperCase()} ${emoji}\n\nMajor: ${selectedMajor.name}\nAI Risk: ${selectedMajor.score}%\n\nCheck yours: cooked-major.vercel.app`;
                  navigator.clipboard.writeText(text);
                  alert("Text copied! Ready to post 🫡");
                }}
                className="py-4 rounded-2xl bg-muted border border-border text-foreground font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                <Sparkles className="w-4 h-4 fill-current" />
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
