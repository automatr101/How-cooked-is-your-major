"use client";

import { useLayoutEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Price } from "@/lib/premium";

// A bar pinned to the bottom of a PHONE screen while the paid offer's own button is off-screen:
// "Unlock your plan · GHS 46.90". It is only a shortcut to the same checkout; the offer card does the selling.
// Hidden from 768px up (it is not for desktop) and whenever `show` is false (the parent decides: payments off or
// gated, plan already unlocked, checkout open, offer button on screen).
//
// While it is on screen it publishes its height as the CSS variable --sticky-cta-h on <html>, so other things pinned
// to the bottom (the rating popup, the page footer's padding) can stay clear of it. At desktop widths the bar is
// display:none, its height is 0, and the variable is 0, so nothing changes there.

export function StickyCta({ show, price, onClick }: { show: boolean; price: Price; onClick: () => void }) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!show) return;
    const el = ref.current;
    if (!el) return;
    const root = document.documentElement;
    const publish = () => root.style.setProperty("--sticky-cta-h", `${el.offsetHeight}px`);
    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--sticky-cta-h");
    };
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          ref={ref}
          role="region"
          aria-label="Unlock your plan"
          initial={reduceMotion ? false : { y: "100%" }}
          animate={{ y: 0 }}
          exit={reduceMotion ? { opacity: 0 } : { y: "100%" }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="fixed inset-x-0 bottom-0 z-[80] border-t border-border bg-background/90 px-4 pt-3 backdrop-blur-xl md:hidden"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <button
            type="button"
            onClick={onClick}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-xl transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Lock aria-hidden className="h-4 w-4 shrink-0" />
            <span>Unlock your plan · {price.label}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
