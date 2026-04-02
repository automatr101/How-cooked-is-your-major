"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Info, Twitter, MessageCircle, ArrowRight, BrainCircuit, Sparkles, ChevronRight, LayoutGrid, Zap, Volume2, VolumeX } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { majors, Major, getLevelColor } from "@/lib/data";
import { AnimatedNumber } from "@/components/ui/animated-number";
import RetroGrid from "@/components/ui/retro-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import TypingAnimation from "@/components/ui/typing-animation";
import { cn } from "@/lib/utils";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { playResultSound, replayLastSound, toggleMute, getIsMuted, getReactionClass, playSiteLoadSound, playReturnSound } from "@/lib/sounds";

import { Hero } from "@/components/hero";
import { LiveTicker } from "@/components/live-ticker";
import { Recommendations } from "@/components/recommendations";

import { toPng } from "html-to-image";



export default function HomeClient() {
  const [query, setQuery] = useState("");
  const [comparisonQuery, setComparisonQuery] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [comparedMajor, setComparedMajor] = useState<Major | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showComparisonSearch, setShowComparisonSearch] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [reactionClass, setReactionClass] = useState("");
  const { resolvedTheme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  // Trigger sound + reaction animation
  const triggerSoundReaction = useCallback((score: number) => {
    const cls = getReactionClass(score);
    // Remove then re-add class to re-trigger animation
    setReactionClass("");
    // Play sound instantly — the 2s scan animation already provides the drama
    playResultSound(score);
    if (cls) {
      requestAnimationFrame(() => {
        setReactionClass(cls);
        setTimeout(() => setReactionClass(""), 1200);
      });
    }
  }, []);

  // Play Discord Join sound when site first loads
  useEffect(() => {
    playSiteLoadSound();
  }, []);

  // Play Discord notification when user returns to the tab (retention boost)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        playReturnSound();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  // Auto-select from URL params on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const majorName = params.get("major");
      if (majorName) {
        const found = majors.find(m => m.name === majorName);
        if (found) {
          setSelectedMajor(found);
          triggerSoundReaction(found.score);
          setTimeout(() => {
            document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
          }, 500);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDownload = async () => {
    if (cardRef.current === null) return;
    try {
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: "transparent",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `cooked-${selectedMajor?.name.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("oops, something went wrong!", err);
    }
  };

  const handleSelect = (major: Major) => {
    setQuery("");
    setIsScanning(true);
    setTimeout(() => {
      setSelectedMajor(major);
      setIsScanning(false);
      triggerSoundReaction(major.score);
      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 2000);
  };

  const handleToggleMute = () => {
    const nowMuted = toggleMute();
    setIsMuted(nowMuted);
  };

  const handleShare = (platform: "x" | "wa") => {
    if (!selectedMajor) return;
    const emoji = selectedMajor.score > 80 ? "💀" : selectedMajor.score > 60 ? "🔥" : "🍳";
    const baseUrl = "https://how-cooked-is-your-major.vercel.app";
    const shareUrl = `${baseUrl}?major=${encodeURIComponent(selectedMajor.name)}&score=${selectedMajor.score}&level=${encodeURIComponent(selectedMajor.level)}`;
    const text = `I'm ${selectedMajor.level.toUpperCase()} ${emoji}\n\nMajor: ${selectedMajor.name}\nAI Risk: ${selectedMajor.score}%\n\nCheck yours: ${shareUrl}`;
    if (platform === "x") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, "_blank");
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }
  };

  const filteredMajors = useMemo(() => {
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
      .slice(0, 10)
      .map(item => item.major);
  }, [query]);

  const filteredComparisonMajors = useMemo(() => {
    if (!comparisonQuery) return [];
    const searchTerms = comparisonQuery.toLowerCase().trim().split(/\s+/);
    return majors
      .map(major => {
        const name = major.name.toLowerCase();
        let score = 0;
        if (name === comparisonQuery.toLowerCase().trim()) score = 100;
        else if (name.startsWith(comparisonQuery.toLowerCase().trim())) score = 80;
        else if (name.includes(comparisonQuery.toLowerCase().trim())) score = 60;
        else if (searchTerms.every(term => name.includes(term))) score = 40;
        return { major, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(item => item.major);
  }, [comparisonQuery]);

  return (
    <main className="relative min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30 flex flex-col items-center pb-24 overflow-hidden font-sans">
      {/* Interactive Hero */}
      <Hero />
      <LiveTicker />

      {/* Mute Toggle — fixed top-right */}
      <button
        onClick={handleToggleMute}
        title={isMuted ? "Unmute sounds" : "Mute sounds"}
        className="fixed top-4 right-4 z-[200] p-2.5 rounded-full bg-card/80 border border-border backdrop-blur-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
      >
        {isMuted
          ? <VolumeX className="w-4 h-4 text-muted-foreground" />
          : <Volume2 className="w-4 h-4 text-primary" />
        }
      </button>

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
            <BackgroundGradient
              containerClassName="w-full max-w-[400px] mx-auto rounded-[30px]"
              className="rounded-[26px] sm:rounded-[32px]"
            >
              <div
                ref={cardRef}
                className={cn(
                  "relative rounded-[26px] sm:rounded-[32px] border-2 sm:border-4 border-foreground bg-card p-4 sm:p-8 md:p-10 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] flex flex-col justify-between sm:aspect-[4/5] overflow-hidden text-foreground w-full",
                  resolvedTheme === "dark" ? "dark" : "",
                  reactionClass
                )}
              >
                {/* Branding on Card */}
                <div className="absolute top-3 left-4 sm:top-6 sm:left-8 flex items-center gap-2 opacity-30">
                  <BrainCircuit className="w-2 h-2 sm:w-3 sm:h-3" />
                  <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-widest">cooked-major.vercel.app</span>
                </div>

                <div className="relative pt-6 sm:pt-8 sm:flex-1 flex flex-col sm:min-h-0">
                  {/* Top Header Area */}
                  <div className="flex justify-between items-start mb-2 sm:mb-4">
                    <div className="max-w-[75%]">
                      <p className="text-[6px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">Verification ID: #882-{selectedMajor.score}</p>
                      <h2 className="text-[11px] sm:text-xl md:text-3xl font-black text-foreground leading-tight tracking-tighter uppercase break-words line-clamp-2 sm:line-clamp-3">{selectedMajor.name}</h2>
                    </div>
                    <div className="p-1 sm:p-3 rounded-lg sm:rounded-2xl bg-foreground text-background shrink-0">
                      <Sparkles className="w-3 h-3 sm:w-7 sm:h-7 fill-current" />
                    </div>
                  </div>

                  {/* Split Dashboard Area */}
                  <div className="grid grid-cols-2 gap-2 mb-1.5 sm:mb-4 pt-1.5 sm:pt-4 border-t border-foreground/10">
                    <div className="space-y-0.5">
                      <p className="text-[5px] sm:text-[8px] font-black text-muted-foreground tracking-[0.2em]">AI RISK LEVEL</p>
                      <div className="relative inline-flex items-baseline gap-0.5">
                        <span className={cn(
                          "text-3xl sm:text-5xl md:text-7xl font-black tabular-nums tracking-tighter leading-none",
                          selectedMajor.score > 80 ? "text-destructive" : selectedMajor.score > 40 ? "text-orange-500" : "text-emerald-500"
                        )}>
                          <AnimatedNumber value={selectedMajor.score} />
                        </span>
                        <span className="text-xs sm:text-lg font-black opacity-30 select-none">%</span>
                      </div>
                    </div>

                    <div className="space-y-0.5 flex flex-col items-start pl-2 sm:pl-4 border-l border-foreground/10">
                      <p className="text-[5px] sm:text-[8px] font-black text-muted-foreground tracking-[0.2em]">SURVIVAL STATUS</p>
                      <span className={cn(
                        "text-[11px] sm:text-xl md:text-3xl font-black tracking-tighter uppercase leading-tight italic",
                        selectedMajor.score > 75 ? "text-destructive" : "text-foreground"
                      )}>
                        {selectedMajor.level}
                      </span>
                    </div>
                  </div>

                  {/* Market Stats Dashboard */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-6 mb-1.5 sm:mb-4 pt-1.5 sm:pt-4 border-t border-foreground/10">
                    <div className="space-y-0.5">
                      <p className="text-[5px] sm:text-[8px] font-black text-muted-foreground tracking-[0.2em]">SALARY RANGE</p>
                      <p className="text-[10px] sm:text-base font-black tabular-nums tracking-tighter text-foreground">
                        {selectedMajor.salary}
                      </p>
                    </div>

                    <div className="space-y-0.5 pl-2 sm:pl-4 border-l border-foreground/10">
                      <p className="text-[5px] sm:text-[8px] font-black text-muted-foreground tracking-[0.2em]">MARKET GROWTH</p>
                      <p className={cn(
                        "text-[10px] sm:text-base font-black tabular-nums tracking-tighter",
                        selectedMajor.growth.includes("-") ? "text-destructive" : "text-emerald-500"
                      )}>
                        {selectedMajor.growth}
                      </p>
                    </div>
                  </div>

                  {/* Roast Verdict Area */}
                  <div className="sm:flex-1 flex flex-col items-center justify-center py-2.5 sm:py-4 border-t-2 border-dashed border-foreground/10 mt-2 sm:mt-0">
                    <h3 className="text-[6px] sm:text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 sm:mb-2 text-center">AI ROAST VERDICT</h3>
                    <p className="text-[10px] sm:text-xs md:text-sm font-black italic text-foreground leading-snug tracking-tight text-center w-full sm:line-clamp-4">
                      &ldquo;{selectedMajor.roast}&rdquo;
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-1.5 sm:pt-6 mt-1 sm:mt-4 border-t border-foreground/10 flex justify-between items-end">
                    <div>
                      <p className="text-[4px] sm:text-[6px] font-black text-muted-foreground uppercase mb-0.5">DATA VERIFIED BY</p>
                      <p className="text-[6px] sm:text-[10px] font-black">MAJORLABS INTELLIGENCE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[4px] sm:text-[6px] font-black text-muted-foreground uppercase mb-0.5">SCAN TO CHECK YOURS</p>
                      <p className="text-[6px] sm:text-[10px] font-black">COOKED-MAJOR.VERCEL.APP</p>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* 🔊 Replay Sound Button */}
            <div className="flex justify-center mt-4">
              <button
                onClick={replayLastSound}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-border bg-card/80 backdrop-blur text-sm font-black text-muted-foreground hover:text-foreground hover:border-primary/40 hover:scale-105 active:scale-95 transition-all shadow"
              >
                <Volume2 className="w-4 h-4" />
                🔊 Replay Sound
              </button>
            </div>

            <Recommendations score={selectedMajor.score} majorName={selectedMajor.name} />

            {/* Comparison Section */}
            <div className="mt-12 w-full">
              {!showComparisonSearch && !comparedMajor && (
                <button
                  onClick={() => setShowComparisonSearch(true)}
                  className="w-full py-6 rounded-3xl border-2 border-dashed border-primary/20 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-black uppercase tracking-widest text-primary flex items-center justify-center gap-3"
                >
                  <Zap className="w-5 h-5 fill-current" />
                  COMPARE WITH ANOTHER MAJOR
                </button>
              )}

              {showComparisonSearch && (
                <div className="relative group w-full mb-8">
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-1000" />
                  <div className="relative flex items-center bg-card border border-border rounded-2xl overflow-hidden backdrop-blur-2xl transition-all focus-within:border-primary/50 focus-within:ring-4 focus-within:ring-primary/5 shadow-xl">
                    <Search className="w-6 h-6 ml-6 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <input
                      type="text"
                      className="w-full bg-transparent border-none text-xl text-foreground placeholder-muted-foreground/50 px-6 py-6 focus:outline-none focus:ring-0 font-bold tracking-tight"
                      placeholder="Select a major to compare..."
                      value={comparisonQuery}
                      onChange={(e) => setComparisonQuery(e.target.value)}
                    />
                  </div>

                  <AnimatePresence>
                    {filteredComparisonMajors.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute top-full left-0 right-0 mt-4 bg-card/90 backdrop-blur-3xl border border-border rounded-2xl overflow-hidden shadow-2xl z-50 p-2"
                      >
                        {filteredComparisonMajors.map((m) => (
                          <button
                            key={m.name}
                            onClick={() => {
                              setComparedMajor(m);
                              setShowComparisonSearch(false);
                              setComparisonQuery("");
                              triggerSoundReaction(m.score);
                            }}
                            className="w-full flex items-center justify-between px-6 py-4 hover:bg-muted rounded-xl text-left transition-all"
                          >
                            <span className="text-foreground font-bold">{m.name}</span>
                            <span className="text-xs font-black text-muted-foreground">{m.score}%</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {comparedMajor && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8"
                >
                  {[selectedMajor, comparedMajor].map((m, idx) => {
                    const isMoreAtRisk = idx === 0 ? selectedMajor.score > comparedMajor.score : comparedMajor.score > selectedMajor.score;
                    return (
                      <div key={m.name} className={cn(
                        "relative rounded-3xl p-6 bg-card border-4",
                        isMoreAtRisk ? "border-destructive/50" : "border-emerald-500/50"
                      )}>
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="text-xl font-black uppercase tracking-tighter leading-none line-clamp-2">{m.name}</h4>
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                            isMoreAtRisk ? "bg-destructive text-white" : "bg-emerald-500 text-white"
                          )}>
                            {isMoreAtRisk ? "MORE AT RISK" : "SAFER CHOICE"}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-5xl font-black">{m.score}%</span>
                          <span className="text-xs font-bold text-muted-foreground uppercase">{m.level}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/10">
                          <div>
                            <p className="text-[8px] font-black text-muted-foreground tracking-widest mb-1 uppercase">SALARY</p>
                            <p className="text-sm font-black">{m.salary}</p>
                          </div>
                          <div>
                            <p className="text-[8px] font-black text-muted-foreground tracking-widest mb-1 uppercase">GROWTH</p>
                            <p className="text-sm font-black">{m.growth}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <button
                    onClick={() => setComparedMajor(null)}
                    className="md:col-span-2 py-4 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear Comparison
                  </button>
                </motion.div>
              )}
            </div>

            {/* Actions for User */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 px-4">
              <button
                onClick={() => handleShare("x")}
                className="py-4 rounded-2xl bg-sky-500 text-white font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                <Twitter className="w-4 h-4 fill-current" />
                SHARE ON X
              </button>
              <button
                onClick={() => handleShare("wa")}
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
                  const emoji = selectedMajor.score > 80 ? "💀" : selectedMajor.score > 60 ? "🔥" : "🍳";
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
