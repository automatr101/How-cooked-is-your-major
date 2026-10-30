import { forwardRef, type ReactNode } from "react";
import { SITE_HOST } from "@/lib/site";

// The branded share tile: 360px square (saved at 3x = 1080px). Inline colours on purpose, so the saved image never depends on the page theme.
export const GameCard = forwardRef<HTMLDivElement, { title: string; subtitle: string; children: ReactNode }>(function GameCard(
  { title, subtitle, children },
  ref
) {
  return (
    <div
      ref={ref}
      style={{ width: 360, height: 360, background: "#0C0C0C", color: "#F4F4F4", border: "1px solid #303030", borderRadius: 24 }}
      className="mx-auto flex flex-col items-center justify-between overflow-hidden p-6 text-center"
    >
      <div>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 0.5, textTransform: "uppercase", lineHeight: 0.98 }}>
          {title}
          <span style={{ color: "#FF6A00" }}>.</span>
        </div>
        <div style={{ fontSize: 13, color: "#A6A6A6", marginTop: 6 }}>{subtitle}</div>
      </div>
      <div className="flex flex-1 items-center justify-center">{children}</div>
      <div style={{ fontSize: 11, color: "#A6A6A6", lineHeight: 1.4 }}>
        <div style={{ color: "#F4F4F4", fontWeight: 600 }}>{SITE_HOST}</div>
        Entertainment, not career advice.
      </div>
    </div>
  );
});
