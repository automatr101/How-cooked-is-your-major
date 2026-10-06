"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Plan } from "@/lib/plan/types";

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

const Items = ({ items }: { items: { title: string; why: string }[] }) => (
  <ul className="space-y-4">
    {items.map((i) => (
      <li key={i.title}>
        <p className="text-sm font-black uppercase leading-snug">{i.title}</p>
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
      </header>

      <Section n="01" title="Overview">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.overview}</p>
      </Section>

      <Section n="02" title="Why you got this score">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.whyScore}</p>
      </Section>

      <Section n="03" title={`AI exposure: ${plan.aiExposure.label}`}>
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

      <Section n="04" title="Career outlook">
        <p className="text-sm leading-relaxed text-foreground/90">{plan.outlook}</p>
      </Section>

      <Section n="05" title="Strong career paths">
        <Items items={plan.strongPaths} />
      </Section>

      <Section n="06" title="Vulnerable career paths">
        <Items items={plan.vulnerablePaths} />
      </Section>

      <Section n="07" title="Skills to develop">
        <Items items={plan.skills} />
      </Section>

      <Section n="08" title="AI tools to learn">
        <Items items={plan.aiTools} />
      </Section>

      <Section n="09" title="Portfolio and project ideas">
        <Items items={plan.projects} />
      </Section>

      <Section n="10" title="Internship and job strategy">
        <Bullets items={plan.internship} />
      </Section>

      <Section n="11" title="Career positioning">
        <Bullets items={plan.positioning} />
      </Section>

      <Section n="12" title="Your 30 / 60 / 90 day plan">
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

      <Section n="13" title="How to become more employable">
        <Bullets items={plan.employability} />
      </Section>

      <Section n="14" title="Where this leaves you">
        <p className="text-sm font-medium leading-relaxed text-foreground/90">{plan.conclusion}</p>
      </Section>
    </article>
  );
}
