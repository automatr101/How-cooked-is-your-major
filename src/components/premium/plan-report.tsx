"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plan/types";
import { PdfBar, usePdfDownload } from "./pdf-download";
import { PlanReviewForm } from "@/components/reviews/plan-review-form";

// The unlocked report. Plain, long-form and editorial: numbered sections, strong headings, restrained colour.

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="space-y-4 border-t border-border/20 pt-8">
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{n}</p>
      <h3 className="mt-1 text-xl font-black italic uppercase tracking-tighter">{title}</h3>
    </div>
    {children}
  </section>
);

const Items = ({ items }: { items: { title: string; why: string; url?: string }[] }) => (
  <ul className="space-y-4">
    {items.map((i) => (
      <li key={i.title}>
        <p className="text-sm font-black uppercase leading-snug">
          {i.url ? (
            <a href={i.url} target="_blank" rel="noopener noreferrer" className="underline decoration-primary/60 underline-offset-4 hover:text-primary">
              {i.title}
            </a>
          ) : (
            i.title
          )}
        </p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{i.why}</p>
      </li>
    ))}
  </ul>
);

const Bullets = ({ items, tone }: { items: string[]; tone?: "good" | "risk" }) => (
  <ul className="space-y-2">
    {items.map((t) => (
      <li key={t} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
        <Check aria-hidden className={cn("mt-0.5 h-4 w-4 shrink-0", tone === "risk" ? "text-orange-500" : "text-emerald-500")} />
        <span>{t}</span>
      </li>
    ))}
  </ul>
);

export function PlanReport({ plan }: { plan: Plan }) {
  const pdf = usePdfDownload(plan);
  let count = 0;
  const n = () => String(++count).padStart(2, "0");
  return (
    <article aria-label={plan.planName} className="space-y-8 rounded-3xl border border-primary/20 bg-card/60 p-6 backdrop-blur-xl sm:p-8">
      <header className="space-y-3">
        <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">
          <Check aria-hidden className="h-3 w-3" /> Unlocked
        </p>
        <h2 className="text-3xl font-black italic uppercase leading-[0.95] tracking-tighter sm:text-4xl">{plan.planName}</h2>
        <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          {plan.major.name} · {plan.major.score}% · {plan.major.level}
        </p>
        <PdfBar pdf={pdf} />
      </header>

      <Section n={n()} title="Overview">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.overview}</p>
      </Section>

      <Section n={n()} title="Why you got this score">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.whyScore}</p>
      </Section>

      <Section n={n()} title={`AI exposure: ${plan.aiExposure.label}`}>
        <p className="text-sm leading-relaxed text-muted-foreground">{plan.aiExposure.summary}</p>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-400">AI already does well</p>
            <Bullets items={plan.aiExposure.atRisk} tone="risk" />
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Stays human</p>
            <Bullets items={plan.aiExposure.staysHuman} />
          </div>
        </div>
      </Section>

      <Section n={n()} title="Career outlook">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.outlook}</p>
      </Section>

      <Section n={n()} title="Strong career paths">
        <Items items={plan.strongPaths} />
      </Section>

      {plan.careers?.length > 0 && (
        <Section n={n()} title="Real jobs and what they pay">
          <ul className="grid gap-3 sm:grid-cols-2">
            {plan.careers.map((c) => (
              <li key={c.title} className="space-y-1.5 rounded-2xl border border-border/40 bg-background/40 p-4">
                <p className="text-sm font-black uppercase leading-snug">{c.title}</p>
                <p className="text-lg font-black tabular-nums text-primary">{c.pay}</p>
                <p className="text-xs font-bold text-muted-foreground">{c.outlook}</p>
                {c.where && <p className="text-xs leading-relaxed text-muted-foreground"><span className="font-bold text-foreground">Where they work:</span> {c.where}</p>}
                <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] font-bold underline underline-offset-2 hover:text-primary">Full profile on O*NET</a>
              </li>
            ))}
          </ul>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{plan.careersSource}</p>
        </Section>
      )}

      <Section n={n()} title="Vulnerable career paths">
        <Items items={plan.vulnerablePaths} />
      </Section>

      <Section n={n()} title="Skills to develop">
        <Items items={plan.skills} />
      </Section>

      <Section n={n()} title="AI tools to learn">
        <Items items={plan.aiTools} />
      </Section>

      {plan.learn?.length > 0 && (
        <Section n={n()} title="Learn it for free">
          <Items items={plan.learn} />
        </Section>
      )}

      <Section n={n()} title="Portfolio and project ideas">
        <Items items={plan.projects} />
      </Section>

      <Section n={n()} title="Internship and job strategy">
        <Bullets items={plan.internship} />
        {plan.jobSearch?.length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">Open these searches now</p>
            <ul className="flex flex-wrap gap-2">
              {plan.jobSearch.map((j) => (
                <li key={j.url}>
                  <a href={j.url} target="_blank" rel="noopener noreferrer" className="inline-block rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:border-primary hover:text-primary">
                    {j.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section n={n()} title="Career positioning">
        <Bullets items={plan.positioning} />
      </Section>

      <Section n={n()} title="Your 30 / 60 / 90 day plan">
        <div className="space-y-6">
          {plan.roadmap.map((phase) => (
            <div key={phase.days} className="space-y-3 rounded-2xl border border-border/40 bg-background/40 p-4 sm:p-5">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black italic tabular-nums text-primary">{phase.days}</span>
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">days</p>
                  <p className="text-sm font-black uppercase">{phase.theme}</p>
                </div>
              </div>
              <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground marker:font-bold marker:text-foreground">
                {phase.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      </Section>

      <Section n={n()} title="How to become more employable">
        <Bullets items={plan.employability} />
      </Section>

      <Section n={n()} title="Where this leaves you">
        <p className="text-sm font-medium leading-relaxed text-foreground/90">{plan.conclusion}</p>
      </Section>

      <div className="border-t border-border/20 pt-8">
        <PdfBar pdf={pdf} />
      </div>

      {/* After delivery: a verified review (stars, an optional line, and consent before anything is shown) */}
      <PlanReviewForm majorName={plan.major.name} slug={plan.major.slug} />
    </article>
  );
}
