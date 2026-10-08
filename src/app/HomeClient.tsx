"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Search, Twitter, MessageCircle, BrainCircuit, Sparkles, ChevronRight, LayoutGrid, Zap, Volume2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { majors, Major, getLevelColor } from "@/lib/data";
import { AnimatedNumber } from "@/components/ui/animated-number";
import RetroGrid from "@/components/ui/retro-grid";
import { BorderBeam } from "@/components/ui/border-beam";
import TypingAnimation from "@/components/ui/typing-animation";
import { cn } from "@/lib/utils";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { playResultSound, replayLastSound, stopAllSounds, getReactionClass, unlockAudio, preloadResultSound, playPendingSound } from "@/lib/sounds";

import { Hero } from "@/components/hero";
import { LiveTicker } from "@/components/live-ticker";
import { Recommendations } from "@/components/recommendations";
import { notifyVisit, notifyScan } from "@/lib/notify";
import { track, trackShare, majorParams, slugify } from "@/lib/analytics";
import { ReviewPopup } from "@/components/review-box";
import { HeardFromPoll } from "@/components/heard-from";
import { MajorSearch } from "@/components/major-search";
import { PremiumOffer } from "@/components/premium/premium-offer";
import { CopiedIcon, DownloadDoneIcon } from "@/components/ui/animated-state-icons";
import { SITE_HOST, SITE_URL } from "@/lib/site";



export default function HomeClient() {
  const [query, setQuery] = useState("");
  // Brief "done" states for the Save card and Copy text buttons (their icons animate to a checkmark).
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [comparisonQuery, setComparisonQuery] = useState("");
  const [selectedMajor, setSelectedMajor] = useState<Major | null>(null);
  const [comparedMajor, setComparedMajor] = useState<Major | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showComparisonSearch, setShowComparisonSearch] = useState(false);
  const [reactionClass, setReactionClass] = useState("");
  const { resolvedTheme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);

  // The roast text shown on the card. `n` changes on every roll so the text re-animates.
  const [roast, setRoast] = useState<{ text: string; n: number } | null>(null);

  // The roast engine (a few hundred lines of content) is loaded on demand: it starts loading when
  // a scan starts, so it is ready by the time the 2-second scan animation ends.
  const roastEngine = useRef<Promise<typeof import("@/lib/roast")> | null>(null);
  const loadRoastEngine = useCallback(() => {
    roastEngine.current ??= import("@/lib/roast").catch((err) => {
      roastEngine.current = null; // allow a retry next time
      throw err;
    });
    return roastEngine.current;
  }, []);

  // Rolls a roast for a major. If the engine ever fails to load, falls back to the roast stored in the data.
  const nextRoast = useCallback(
    async (major: Major): Promise<{ text: string; type: string }> => {
      try {
        const { rollRoast } = await loadRoastEngine();
        const r = rollRoast({ name: major.name, score: major.score });
        return { text: r.text, type: r.category };
      } catch {
        return { text: major.roast, type: "stored" };
      }
    },
    [loadRoastEngine]
  );

  // "Roast Me Again": a new roast for the same result. Nothing else on the page changes.
  const rollAgain = () => {
    if (!selectedMajor) return;
    nextRoast(selectedMajor).then((r) => {
      setRoast({ text: r.text, n: Date.now() });
      track("roast_regenerated", { major_name: selectedMajor.name });
    });
  };

  // Trigger the reaction animation, and the result sound unless `withSound` is false
  const triggerSoundReaction = useCallback((score: number, withSound = true) => {
    const cls = getReactionClass(score);
    // Remove then re-add class to re-trigger animation
    setReactionClass("");
    if (withSound) playResultSound(score);
    if (cls) {
      requestAnimationFrame(() => {
        setReactionClass(cls);
        setTimeout(() => setReactionClass(""), 1200);
      });
    }
  }, []);

  // Unlock audio on first user interaction (iOS/Android requirement).
  // This only primes the audio system with a silent clip; it makes no noise.
  useEffect(() => {
    let unlocked = false;
    const handleFirstInteraction = () => {
      if (unlocked) return;
      unlocked = true;
      unlockAudio();
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    };
    document.addEventListener("touchstart", handleFirstInteraction, { once: true });
    document.addEventListener("click", handleFirstInteraction, { once: true });
    return () => {
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    };
  }, []);

  // Telegram visit alert (once per session; the server decides whether to send it)
  useEffect(() => {
    notifyVisit();
  }, []);

  // Silence anything still playing when the visitor switches tabs or leaves the page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") stopAllSounds();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopAllSounds();
    };
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
          nextRoast(found).then((r) => {
            setRoast({ text: r.text, n: Date.now() });
            track("roast_generated", { major_name: found.name, cooked_score: found.score, roast_type: r.type });
          });
          track("major_result_view", { ...majorParams(found), view_source: "link" });
          // The visitor came from a link someone shared from this site (it carries our share campaign tag)
          if (params.get("utm_campaign") === "major_share") track("shared_link_visit", { major_slug: slugify(found.name), via: params.get("utm_source") ?? "" });
          triggerSoundReaction(found.score, false); // opened from a shared link: no sound on arrival
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
      const { toPng } = await import("html-to-image"); // only loaded when someone saves a card
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: "transparent",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `cooked-${selectedMajor?.name.toLowerCase()}.png`;
      link.href = dataUrl;
      link.click();
      if (selectedMajor) {
        track("share_card_generated", { major_name: selectedMajor.name, cooked_score: selectedMajor.score });
        track("share_card_downloaded", { major_name: selectedMajor.name, cooked_score: selectedMajor.score });
        trackShare("download", selectedMajor.name);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("oops, something went wrong!", err);
    }
  };

  const handleSelect = (major: Major) => {
    setQuery("");
    setIsScanning(true);
    notifyScan(major.name);
    track("major_scan", majorParams(major));
    // Preload the sound NOW during the click gesture (mobile needs this)
    preloadResultSound(major.score);
    loadRoastEngine().catch(() => {}); // warm up the roast engine while the scan animation runs
    setTimeout(async () => {
      const r = await nextRoast(major); // already loaded by now, so this resolves immediately
      setRoast({ text: r.text, n: Date.now() });
      setSelectedMajor(major);
      setIsScanning(false);
      track("major_result_view", { ...majorParams(major), view_source: "scan" });
      track("roast_generated", { major_name: major.name, cooked_score: major.score, roast_type: r.type });
      // Play the preloaded sound — works on iOS/Android
      playPendingSound(major.score);
      const cls = getReactionClass(major.score);
      if (cls) {
        setReactionClass("");
        requestAnimationFrame(() => {
          setReactionClass(cls);
          setTimeout(() => setReactionClass(""), 1200);
        });
      }
      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 2000);
  };

  // The text that gets shared or copied. It includes the current roast when there is one.
  const buildShareText = (link: string, withRoast = true) => {
    if (!selectedMajor) return "";
    const emoji = selectedMajor.score > 80 ? "💀" : selectedMajor.score > 60 ? "🔥" : "🍳";
    const quote = withRoast && roast ? `"${roast.text}"\n\n` : "";
    return `I'm ${selectedMajor.level.toUpperCase()} ${emoji}\n\n${quote}Major: ${selectedMajor.name}\nAI Risk: ${selectedMajor.score}%\n\nCheck yours: ${link}`;
  };

  // The link to share. It points at the small pre-built page /share/<major> (see app/share), so link previews
  // load fast and reliably; people who open it are sent straight on to their result. `from` tags links we hand
  // out (not the page's own URL) so GA4 can show which shares bring visitors.
  const resultLink = (from?: { source: string; medium: string }) =>
    selectedMajor
      ? `${SITE_URL}/share/${slugify(selectedMajor.name)}${
          // utm_content = the major, so GA4 can show which majors people share and which ones bring visitors back
          from ? `?utm_source=${from.source}&utm_medium=${from.medium}&utm_campaign=major_share&utm_content=${slugify(selectedMajor.name)}` : ""
        }`
      : SITE_URL;

  const handleShare = (platform: "x" | "wa") => {
    if (!selectedMajor) return;
    const shareUrl = resultLink(platform === "x" ? { source: "x", medium: "social" } : { source: "whatsapp", medium: "referral" });
    let text = buildShareText(shareUrl);
    // X counts every link as 23 characters and allows 280. Drop the roast if it would not fit.
    if (platform === "x" && text.length - shareUrl.length + 23 > 270) text = buildShareText(shareUrl, false);
    trackShare(platform === "x" ? "twitter" : "whatsapp", selectedMajor.name);
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
      // Equally good matches: shorter names first, so "comp" suggests "Computer Science" before
      // "Computational Accounting Analytics". (Enter picks the top match.)
      .sort((a, b) => b.score - a.score || a.major.name.length - b.major.name.length)
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
      <div id="search" className="w-full max-w-xl mt-16 relative z-30 px-6">
        <MajorSearch
          value={query}
          onChange={(value) => {
            setQuery(value);
            if (selectedMajor) setSelectedMajor(null);
          }}
          results={filteredMajors}
          onSelect={handleSelect}
        />
      </div>

      {/* Result Section */}
      <AnimatePresence mode="wait">
        {selectedMajor && (
          <motion.div
            key={selectedMajor.name}
            initial={{ opacity: 0, scale: 0.9, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 30 }}
            className="w-full max-w-2xl lg:max-w-5xl mt-16 z-20 relative px-4"
            id="result"
          >
            {/* Laptops and desktops: the card and its tips on the left, compare and share on the right. Phones stack them. */}
            <div className="lg:grid lg:grid-cols-[400px_minmax(0,1fr)] lg:gap-12 lg:items-start lg:justify-center">
            <div className="min-w-0">
            {/* The Actual Downloadable Card - Optimized for IG 4:5 Ratio */}
            <BackgroundGradient
              containerClassName="w-full max-w-[400px] mx-auto rounded-[30px]"
              className="rounded-[26px] sm:rounded-[32px]"
            >
              <div
                ref={cardRef}
                className={cn(
                  "relative rounded-[26px] sm:rounded-[32px] border-2 sm:border-4 border-foreground bg-card p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,0.1)] sm:shadow-[10px_10px_0px_0px_rgba(0,0,0,0.1)] flex flex-col justify-between sm:aspect-[4/5] overflow-clip text-foreground w-full",
                  resolvedTheme === "dark" ? "dark" : "",
                  reactionClass
                )}
              >
                {/* Branding on Card */}
                <div className="absolute top-3 left-4 sm:top-5 sm:left-6 flex items-center gap-2 opacity-30">
                  <BrainCircuit className="w-2 h-2 sm:w-3 sm:h-3" />
                  <span className="text-[6px] sm:text-[8px] font-black uppercase tracking-widest">{SITE_HOST}</span>
                </div>

                <div className="relative pt-6 sm:flex-1 flex flex-col">
                  {/* Top Header Area */}
                  <div className="flex justify-between items-start mb-2 sm:mb-3">
                    <div className="max-w-[75%]">
                      <p className="text-[6px] sm:text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-0.5">Verification ID: #882-{selectedMajor.score}</p>
                      <h2 className="text-[11px] sm:text-xl font-black text-foreground leading-tight tracking-tighter uppercase break-words line-clamp-2 sm:line-clamp-3">{selectedMajor.name}</h2>
                    </div>
                    <div className="p-1 sm:p-3 rounded-lg sm:rounded-2xl bg-foreground text-background shrink-0">
                      <Sparkles className="w-3 h-3 sm:w-7 sm:h-7 fill-current" />
                    </div>
                  </div>

                  {/* Split Dashboard Area */}
                  <div className="grid grid-cols-2 gap-2 mb-1.5 sm:mb-3 pt-1.5 sm:pt-3 border-t border-foreground/10">
                    <div className="space-y-0.5">
                      <p className="text-[5px] sm:text-[8px] font-black text-muted-foreground tracking-[0.2em]">AI RISK LEVEL</p>
                      <div className="relative inline-flex items-baseline gap-0.5">
                        <span className={cn(
                          "text-3xl sm:text-5xl font-black tabular-nums tracking-tighter leading-none",
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
                        "text-[11px] sm:text-xl font-black tracking-tighter uppercase leading-tight italic",
                        selectedMajor.score > 75 ? "text-destructive" : "text-foreground"
                      )}>
                        {selectedMajor.level}
                      </span>
                    </div>
                  </div>

                  {/* Market Stats Dashboard */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-6 mb-1.5 sm:mb-3 pt-1.5 sm:pt-3 border-t border-foreground/10">
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

                  {/* The roast, quoted */}
                  <div className="sm:flex-1 flex flex-col items-center justify-center py-2.5 sm:py-3 border-t-2 border-dashed border-foreground/10 mt-2 sm:mt-0 max-sm:min-h-[4.5rem]">
                    {/* A new key on every roll makes the text fade/slide in. Quick and subtle. */}
                    <motion.p
                      key={roast?.n ?? "initial"}
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.22, ease: "easeOut" }}
                      aria-live="polite"
                      className="text-[10px] sm:text-xs font-black italic text-foreground leading-snug tracking-tight text-center w-full sm:line-clamp-4"
                    >
                      &ldquo;{roast?.text ?? selectedMajor.roast}&rdquo;
                    </motion.p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-1.5 sm:pt-4 mt-1 sm:mt-3 border-t border-foreground/10 flex justify-between items-end">
                    <div>
                      <p className="text-[4px] sm:text-[6px] font-black text-muted-foreground uppercase mb-0.5">DATA VERIFIED BY</p>
                      <p className="text-[6px] sm:text-[10px] font-black">MAJORLABS INTELLIGENCE</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[4px] sm:text-[6px] font-black text-muted-foreground uppercase mb-0.5">SCAN TO CHECK YOURS</p>
                      <p className="text-[6px] sm:text-[8px] font-black whitespace-nowrap">{SITE_HOST.toUpperCase()}</p>
                    </div>
                  </div>
                </div>
              </div>
            </BackgroundGradient>

            {/* 🔥 Roast Me Again: a new roast for the same result (no rescan, no reload, no sound) */}
            <div className="flex justify-center mt-5">
              <button
                onClick={rollAgain}
                className="px-8 py-4 rounded-full bg-primary text-primary-foreground text-sm sm:text-base font-black uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                🔥 Roast Me Again
              </button>
            </div>

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

            </div>

            <div className="min-w-0 lg:sticky lg:top-24">
            {/* Comparison Section */}
            <div className="mt-12 lg:mt-0 w-full">
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
                              track("compare_major", { major_1: selectedMajor.name, major_2: m.name, where: "result" });
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
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6 mt-8 lg:mt-0"
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
                    className="md:col-span-2 lg:col-span-1 py-4 text-[10px] font-black uppercase text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear Comparison
                  </button>
                </motion.div>
              )}
            </div>

            {/* Actions for User */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-2 gap-4 mt-8 px-4 lg:px-0">
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
                <DownloadDoneIcon active={saved} size={24} className="-ml-1" />
                {saved ? "SAVED" : "SAVE CARD"}
              </button>
              <button
                onClick={() => {
                  const text = buildShareText(resultLink({ source: "copy_link", medium: "referral" }));
                  navigator.clipboard
                    .writeText(text)
                    .then(() => {
                      if (selectedMajor) trackShare("copy_link", selectedMajor.name);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    })
                    .catch(() => alert("Couldn't copy. Select the text and copy it by hand."));
                }}
                className="py-4 rounded-2xl bg-muted border border-border text-foreground font-black text-sm flex items-center justify-center gap-2 hover:scale-[1.05] active:scale-95 transition-all shadow-lg"
              >
                <CopiedIcon active={copied} size={24} className="-ml-1" />
                <span aria-live="polite">{copied ? "COPIED!" : "COPY TEXT"}</span>
              </button>
            </div>

            {/* One tap, once per browser: where did this visitor hear about the site? Answers the traffic analytics cannot see */}
            <HeardFromPoll />

            <div className="mt-8">
              <Recommendations score={selectedMajor.score} majorName={selectedMajor.name} />
            </div>

            {/* The paid career plan. Renders nothing unless NEXT_PUBLIC_PAYMENTS_MODE is "test" or "live". */}
            <PremiumOffer major={selectedMajor} />
            </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The rating popup appears after a few seconds. Reviews go to Telegram; the scanned major (if any) is attached as context */}
      <ReviewPopup majorName={selectedMajor?.name} hasResult={!!selectedMajor} />

      {/* Footer */}
      <footer className="mt-auto pt-24 pb-12 text-center space-y-3 opacity-60">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-[0.3em]">
          &copy; 2026 MajorLabs Intelligence
        </p>
        <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
          <span className="opacity-30">·</span>
          <a href="/contact" className="hover:text-foreground transition-colors">Contact</a>
          <span className="opacity-30">·</span>
          <a href="https://twitter.com/cookedlabs_cto" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">@cookedlabs_cto</a>
        </div>
      </footer>
    </main>
  );
}
