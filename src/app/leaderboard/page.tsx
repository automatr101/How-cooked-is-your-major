"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Trophy, Flame, Shield, Search, Zap, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { majors, Major, getLevelColor } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function LeaderboardPage() {
  const [sortBy, setSortBy] = useState<"scanned" | "cooked">("scanned");

  // Create a leaderboard with mock scan counts for initial display
  const leaderboardData = useMemo(() => {
    return majors.map(m => ({
      ...m,
      // Re-engineered scan count: ranges from 100 to 9,000 with more realistic, irregular gaps
      scanCount: Math.floor(
        ((m.name.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) % 10000, 0) / 10000) * 8900) + 100
      )
    }));
  }, []);

  const sortedMajors = useMemo(() => {
    if (sortBy === "scanned") {
      return [...leaderboardData].sort((a, b) => b.scanCount - a.scanCount);
    } else {
      return [...leaderboardData].sort((a, b) => b.score - a.score);
    }
  }, [sortBy, leaderboardData]);

  const top100 = sortedMajors.slice(0, 100);

  return (
    <main className="min-h-screen bg-background text-foreground font-sans p-6 md:p-12 pb-24">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <Link 
              href="/" 
              className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              Return Home
            </Link>
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter uppercase italic leading-none">
              Major <br />
              <span className="text-primary underline decoration-destructive decoration-wavy underline-offset-4">Leaderboard</span>
            </h1>
            <p className="text-muted-foreground font-medium text-lg">
              Ranked data from over <span className="text-foreground font-black">2.4M</span> scans. See who's surviving the AI era.
            </p>
          </div>

          <div className="flex bg-card/50 border border-border p-1 rounded-2xl overflow-hidden self-start">
            <button
              onClick={() => setSortBy("scanned")}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                sortBy === "scanned" ? "bg-primary text-background shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Most Scanned
            </button>
            <button
              onClick={() => setSortBy("cooked")}
              className={cn(
                "px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                sortBy === "cooked" ? "bg-destructive text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Most Cooked
            </button>
          </div>
        </div>

        {/* Table/List */}
        <div className="bg-card/40 border border-border/50 rounded-[40px] overflow-hidden backdrop-blur-3xl shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/10 bg-muted/30">
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Rank</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Major</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Risk Score</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground">Status</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground text-right">Scans</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence mode="popLayout">
                  {top100.map((major, idx) => (
                    <motion.tr 
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      key={major.name} 
                      className="border-b border-border/5 hover:bg-muted/50 transition-colors group"
                    >
                      <td className="px-8 py-6 font-mono font-black italic opacity-30 group-hover:opacity-100 transition-opacity">
                        #{idx + 1}
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-base font-black uppercase tracking-tighter truncate max-w-[200px] block">
                          {major.name}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "text-xl font-black tabular-nums",
                          major.score > 70 ? "text-destructive" : major.score > 40 ? "text-orange-500" : "text-emerald-500"
                        )}>
                          {major.score}%
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                          major.score > 66 
                            ? "bg-destructive/10 text-destructive border-destructive/20" 
                            : major.score > 33
                            ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                            : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        )}>
                          {major.score > 66 ? "FULLY COOKED" : major.score > 33 ? "KINDA COOKED" : "NOT COOKED"}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-right font-bold tabular-nums text-muted-foreground">
                        {major.scanCount.toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center justify-center p-12 bg-primary rounded-[40px] text-background text-center space-y-6 shadow-[0_20px_50px_rgba(255,224,194,0.15)]">
           <Zap className="w-12 h-12 fill-current" />
           <div className="space-y-2">
             <h2 className="text-4xl font-black uppercase tracking-tighter italic">Is your degree next?</h2>
             <p className="font-bold uppercase tracking-widest opacity-80 text-xs">Don't wait until graduation to find out you're redundant.</p>
           </div>
           <Link href="/" className="inline-flex items-center gap-3 bg-background text-foreground px-8 py-4 rounded-2xl font-black uppercase text-sm hover:scale-[1.05] active:scale-95 transition-all">
             Scan Your Major
             <ArrowRight className="w-5 h-5" />
           </Link>
        </div>

      </div>

      {/* Footer */}
      <footer className="mt-24 text-center text-muted-foreground text-[10px] font-black uppercase tracking-[0.4em] opacity-30">
           MajorLabs Intelligence Vector v.04
      </footer>
    </main>
  );
}
