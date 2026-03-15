"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const placeholders = [
  { major: "Computer Science", score: 85, level: "Very Cooked" },
  { major: "Mechanical Engineering", score: 45, level: "Kinda Cooked" },
  { major: "Graphic Design", score: 92, level: "Extremely Cooked" },
  { major: "Nursing", score: 12, level: "Not Cooked" },
  { major: "Accounting", score: 78, level: "Cooked" },
  { major: "Digital Marketing", score: 65, level: "Kinda Cooked" },
  { major: "Psychology", score: 30, level: "Slightly Cooked" },
  { major: "Data Science", score: 88, level: "Very Cooked" },
  { major: "Architecture", score: 55, level: "Kinda Cooked" },
];

export function LiveTicker() {
  const [scans, setScans] = useState(placeholders);

  // In a real app, you'd fetch the latest 10-15 scans from Supabase here
  // For now, we'll use our placeholders to ensure it looks alive immediately

  const tickerContent = scans.map((s, i) => (
    <span key={i} className="inline-flex items-center gap-2">
      <span className="text-primary font-bold">{s.major}</span>
      <span className="text-muted-foreground/60">rated</span>
      <span className={s.score > 70 ? "text-destructive" : "text-emerald-500"}>
        {s.score}% cooked
      </span>
      <span className="mx-4 text-muted-foreground/20">•</span>
    </span>
  ));

  return (
    <div className="w-full bg-card/30 border-y border-border/5 py-2 overflow-hidden whitespace-nowrap relative z-20">
      <div className="max-w-7xl mx-auto flex items-center px-6">
        <div className="flex items-center gap-2 mr-6 shrink-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Live Scans</span>
        </div>
        
        <div className="flex overflow-hidden">
          <motion.div
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              duration: 30,
              repeat: Infinity,
              ease: "linear",
            }}
            className="flex items-center gap-4 text-[12px] font-medium"
          >
            {/* Double the content for seamless loop */}
            {[...tickerContent, ...tickerContent]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
