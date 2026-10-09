"use client";

import { motion } from "framer-motion";
import { majors } from "@/lib/data";

// A scrolling strip of real scores from our own data. It used to be labelled "Live Scans" and showed made-up
// numbers; it now says what it is: featured majors, with their real scores.
const FEATURED = [
  "Computer Science",
  "Mechanical Engineering",
  "Graphic Design",
  "Nursing",
  "Accounting",
  "Digital Marketing",
  "Psychology",
  "Data Science",
  "Architecture",
  "Law",
];

const items = FEATURED.map((name) => majors.find((m) => m.name === name)).filter((m): m is NonNullable<typeof m> => !!m);

export function LiveTicker() {
  const renderItems = (copy: number) =>
    items.map((s, i) => (
      <span key={`${copy}-${i}`} className="inline-flex items-center gap-2">
        <span className="text-primary font-bold">{s.name}</span>
        <span className="text-muted-foreground/60 mx-1">rated</span>
        <span className={s.score > 70 ? "text-destructive" : "text-emerald-500"}>{s.score}% cooked</span>
        <span className="mx-4 text-muted-foreground/20">•</span>
      </span>
    ));

  return (
    <div className="w-full bg-card/30 border-y border-border/5 py-2 overflow-hidden whitespace-nowrap relative z-20">
      <div className="max-w-7xl mx-auto flex items-center px-6">
        <div className="flex items-center gap-2 mr-6 shrink-0">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Featured scores</span>
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
            {[...renderItems(0), ...renderItems(1)]}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
