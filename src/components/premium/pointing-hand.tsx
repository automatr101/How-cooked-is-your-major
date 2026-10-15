"use client";

import { motion, useReducedMotion } from "framer-motion";

// A cartoon glove that bobs up and down, pointing at the unlock button under it. Purely decoration: it is hidden from
// screen readers, cannot be tapped (taps go to the button), takes no layout space of its own (the parent reserves it, so
// nothing shifts when it appears) and stands still for visitors who ask their device to reduce motion.

export function PointingHand({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
      transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width="32" height="43" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* cuff */}
        <rect x="9" y="1.5" width="30" height="9" rx="3" fill="#fff" stroke="#111" strokeWidth="3" />
        {/* palm */}
        <path d="M9 11h30v17c0 4-3 7-7 7H16c-4 0-7-3-7-7V11Z" fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        {/* folded fingers on the right */}
        <path d="M39 15c4 0 6 2 6 5s-2 5-6 5" fill="#fff" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M39 25c3.5 0 5 1.8 5 4s-1.5 4-5 4" fill="#fff" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* thumb on the left */}
        <path d="M9 17c-4 0-6 2-6 5s2 5 6 6" fill="#fff" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* the pointing index finger */}
        <path d="M17 32h12v20c0 4-2.5 7-6 7s-6-3-6-7V32Z" fill="#fff" stroke="#111" strokeWidth="3" strokeLinejoin="round" />
        {/* knuckle lines, the classic glove detail */}
        <path d="M20 15v8M28 15v8" stroke="#111" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}
