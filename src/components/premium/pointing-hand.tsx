"use client";

import { motion, useReducedMotion } from "framer-motion";

// A vintage engraved hand that bobs up and down, pointing at the unlock button under it (the owner's image, cut out of its
// paper so it sits on any background: public/pointing-hand.png). Purely decoration: hidden from screen readers, cannot be
// tapped (taps go to the button), takes no layout space of its own (the parent reserves it, so nothing shifts when it
// appears) and stands still for visitors who ask their device to reduce motion.

export function PointingHand({ className = "" }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      aria-hidden
      className={`pointer-events-none select-none ${className}`}
      animate={reduceMotion ? undefined : { y: [0, 7, 0] }}
      transition={reduceMotion ? undefined : { duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- one tiny static image, nothing to optimise */}
      <img src="/pointing-hand.png" alt="" width={34} height={66} decoding="async" draggable={false} className="h-[66px] w-[34px]" />
    </motion.div>
  );
}
