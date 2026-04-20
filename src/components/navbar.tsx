"use client";

import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 bg-primary rounded-xl group-hover:rotate-12 transition-transform duration-300">
            <BrainCircuit className="w-5 h-5 text-background" />
          </div>
          <span className="font-black tracking-tighter text-xl uppercase italic hidden sm:block">
            Cooked<span className="text-primary">Major</span>
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="flex bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-1 gap-1">
            <Link 
              href="/leaderboard"
              className="px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all whitespace-nowrap"
            >
              Leaderboard
            </Link>
            <Link 
              href="/compare"
              className="px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all whitespace-nowrap"
            >
              Compare
            </Link>
            <Link 
              href="/privacy"
              className="hidden sm:block px-4 sm:px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all whitespace-nowrap"
            >
              Privacy
            </Link>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
