import type { Major } from "@/lib/data";
import type { PlanPreview } from "@/lib/plan/preview";

// The product, shown as a product: the visitor's own plan as a small stack of PDF pages, like a cover on a store page.
// Nothing here is a mock-up of something they would not get. The cover copies the real PDF cover (same layout, their major,
// their score, the plan's real name), and the page peeking out behind it shows the plan's real "jobs & pay" line for this
// major (the same free teaser the offer already gives). The rest of that page is placeholder bars, never the locked text.
// Flat on purpose (brand: no gradients, no shadows): the depth is just the offset page edges.

// Same colour rule as the PDF cover (lib/pdf/plan-pdf.tsx levelColor), so the book matches the file they get
const band = (score: number) => (score > 80 ? "#E54D2E" : score > 40 ? "#F97316" : "#10B981");

export function PlanBook({ major, preview }: { major: Major; preview: PlanPreview | null }) {
  const color = band(major.score);
  const nameSize = major.name.length > 30 ? "text-[13px]" : major.name.length > 18 ? "text-base" : "text-xl";
  const job = preview?.teaserJob;

  return (
    <figure className="relative mx-auto h-[236px] w-[292px] select-none" aria-label={`Preview of your ${major.name} plan: the cover and a page from inside`}>
      {/* Back page: the roadmap, edge only */}
      <div aria-hidden className="absolute left-[146px] top-[16px] h-[204px] w-[144px] rotate-[8deg] rounded-md border border-[#2c2c2c] bg-[#151515] py-3 pl-[64px] pr-3">
        <p className="font-mono text-[6px] font-bold uppercase tracking-[0.18em] text-[#FFE0C2]">04 / The Roadmap</p>
        <div className="mt-2 h-[2px] w-6 bg-[#F97316]" />
        {[90, 70, 82, 60, 76, 52].map((w, i) => (
          <div key={i} className="mt-2.5 h-1.5 rounded-full bg-[#2c2c2c]" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Middle page: real jobs & pay, with this major's real teaser line */}
      <div aria-hidden className="absolute left-[104px] top-[8px] h-[212px] w-[156px] rotate-[3deg] rounded-md border border-[#2c2c2c] bg-[#191919] py-3 pl-[58px] pr-3">
        <p className="font-mono text-[6px] font-bold uppercase tracking-[0.18em] text-[#FFE0C2]">03 / Real jobs &amp; pay</p>
        <div className="mt-2 h-[2px] w-6 bg-[#F97316]" />
        {job ? (
          <div className="mt-3 rounded border border-[#2c2c2c] bg-[#111111] p-1.5">
            <p className="text-[7px] font-black uppercase leading-tight text-[#eeeeee]">{job.title}</p>
            <p className="mt-0.5 text-[6.5px] font-bold leading-tight text-[#10B981]">{job.pay}</p>
          </div>
        ) : (
          <div className="mt-3 h-6 rounded border border-[#2c2c2c] bg-[#111111]" />
        )}
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-1.5 rounded border border-[#2c2c2c] bg-[#111111] p-1.5">
            <div className="h-1.5 w-3/4 rounded-full bg-[#2c2c2c] blur-[1px]" />
            <div className="mt-1 h-1 w-1/2 rounded-full bg-[#2c2c2c] blur-[1px]" />
          </div>
        ))}
      </div>

      {/* The cover, as the real PDF cover */}
      <div aria-hidden className="absolute left-0 top-0 flex h-[226px] w-[160px] -rotate-[2deg] flex-col rounded-md border border-[#3a3a3a] bg-[#111111] p-3.5">
        <div className="flex justify-between font-mono text-[5.5px] font-bold uppercase tracking-[0.16em]">
          <span className="text-[#FFE0C2]">MajorLabs Intelligence</span>
          <span className="text-[#9a9a9a]">2026</span>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <p className="font-mono text-[6px] font-bold uppercase tracking-[0.18em] text-[#F97316]">The Survival Plan</p>
          <p className={`mt-1.5 line-clamp-3 font-black uppercase leading-[0.95] tracking-tight text-[#eeeeee] ${nameSize}`}>{major.name}</p>
          <div className="mt-2 h-[3px] w-8 bg-[#FFE0C2]" />
          <div className="mt-3 flex items-end gap-2">
            <p className="text-[40px] font-black leading-[0.85] tracking-tighter tabular-nums" style={{ color }}>
              {major.score}%
            </p>
            <p className="mb-0.5 text-[7px] font-black uppercase leading-tight" style={{ color }}>
              {major.level}
            </p>
          </div>
          {preview?.planName && preview.planName.trim().toLowerCase() !== "the survival plan" && (
            <div className="mt-3 border-t border-[#2c2c2c] pt-1.5">
              <p className="font-mono text-[5px] font-bold uppercase tracking-[0.16em] text-[#9a9a9a]">Your plan</p>
              <p className="mt-0.5 line-clamp-2 text-[8px] font-black uppercase leading-tight text-[#FFE0C2]">{preview.planName}</p>
            </div>
          )}
        </div>
      </div>

      <figcaption className="absolute -bottom-1 left-0 right-0 text-center font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        PDF · written for {major.name.length <= 22 ? major.name : "your major"}
      </figcaption>
    </figure>
  );
}
