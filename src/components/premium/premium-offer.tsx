"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check, Lock } from "lucide-react";
import type { Major } from "@/lib/data";
import { slugify } from "@/lib/analytics";
import { PAYMENTS_MODE, PLAN_COPY, PRICE_LABEL, planTypeFor } from "@/lib/premium";
import { setGated, trackOfferClicked, trackOfferViewed, trackReportUnlocked } from "@/lib/premium-analytics";
import type { Plan } from "@/lib/plan/types";
import { CheckoutDialog } from "./checkout-dialog";
import { PlanReport } from "./plan-report";

// The paid career plan, shown after the free result. The free score, roast, sharing, compare and
// leaderboard are not touched by anything here. With NEXT_PUBLIC_PAYMENTS_MODE unset or "off" this renders
// nothing at all.

const UNLOCKED_KEY = "cm_unlocked"; // slugs unlocked in this browser session; the server still checks the cookie

function unlockedSlugs(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(UNLOCKED_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function rememberUnlocked(slug: string) {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify([...new Set([...unlockedSlugs(), slug])]));
  } catch {}
}
function forgetUnlocked(slug: string) {
  try {
    sessionStorage.setItem(UNLOCKED_KEY, JSON.stringify(unlockedSlugs().filter((s) => s !== slug)));
  } catch {}
}

/** Returning from the payment page: the address carries ?cm_checkout=1&reference=... for this major. */
function readResume(majorName: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const p = new URLSearchParams(window.location.search);
  const ref = p.get("reference") ?? p.get("trxref");
  return p.get("cm_checkout") === "1" && p.get("major") === majorName && ref && /^cm-[a-z0-9]{6,12}-[a-f0-9]{12}$/.test(ref) ? ref : undefined;
}

// Asks the server once per page load whether THIS visitor may see the offer: payments on, and if the private gate is
// closed, the browser must carry the gate cookie. Anything unclear means "hide it".
let statusRequest: Promise<{ enabled: boolean; gated: boolean }> | null = null;
function fetchStatus() {
  statusRequest ??= fetch("/api/payments/status", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { enabled: false, gated: false }))
    .catch(() => ({ enabled: false, gated: false }));
  return statusRequest;
}

export function PremiumOffer({ major }: { major: Major }) {
  const [status, setStatus] = useState<{ enabled: boolean; gated: boolean } | null>(null);
  useEffect(() => {
    if (PAYMENTS_MODE === "off") return;
    let live = true;
    fetchStatus().then((s) => {
      setGated(s.gated);
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);
  if (PAYMENTS_MODE === "off" || !status?.enabled) return null;
  return <Offer key={major.name} major={major} />;
}

function Offer({ major }: { major: Major }) {
  const planType = planTypeFor(major.score);
  const copy = PLAN_COPY[planType];
  const slug = slugify(major.name);

  const [resume] = useState(() => readResume(major.name));
  const [open, setOpen] = useState(!!resume);
  const [plan, setPlan] = useState<Plan | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);

  // Fetches the report. The server answers only if this browser's signed unlock cookie covers this major.
  const loadPlan = useCallback(async (): Promise<boolean> => {
    try {
      const res = await fetch(`/api/plan?major=${encodeURIComponent(major.name)}`, { cache: "no-store" });
      if (!res.ok) {
        if (res.status === 402) forgetUnlocked(slug);
        return false;
      }
      const data = (await res.json()) as { plan: Plan };
      rememberUnlocked(slug);
      setPlan(data.plan);
      trackReportUnlocked(major, planType);
      return true;
    } catch {
      return false;
    }
  }, [major, planType, slug]);

  // "Offer viewed": when the card has really been on screen
  useEffect(() => {
    const el = cardRef.current;
    if (!el || plan) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackOfferViewed(major, planType);
          io.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [major, planType, plan]);

  // Back to the result during the same session: show the plan again if this browser already paid for it
  useEffect(() => {
    if (!unlockedSlugs().includes(slug)) return;
    const id = setTimeout(loadPlan, 0);
    return () => clearTimeout(id);
  }, [slug, loadPlan]);

  // Returning from the payment page: tidy the address so a reload does not start a second check
  useEffect(() => {
    if (!resume) return;
    const url = new URL(window.location.href);
    ["cm_checkout", "reference", "trxref"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(null, "", url);
  }, [resume]);

  const viewPlan = () => {
    setOpen(false);
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  // The checkout sits outside the card and the report, so it stays on screen while the report loads behind it
  const dialog = (
    <AnimatePresence>
      {open && (
        <CheckoutDialog
          major={major}
          planType={planType}
          resumeReference={resume}
          onPaid={loadPlan}
          onClose={() => setOpen(false)}
          onViewPlan={viewPlan}
        />
      )}
    </AnimatePresence>
  );

  if (plan) {
    return (
      <>
        <div ref={planRef} id="premium-plan" className="mt-8 scroll-mt-24">
          <PlanReport plan={plan} />
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
    <div ref={cardRef} id="premium-offer" className="relative mt-8 overflow-hidden rounded-3xl border border-primary/25 bg-card/60 p-6 backdrop-blur-xl sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{copy.eyebrow}</p>
            {PAYMENTS_MODE === "test" && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                Test mode
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black italic uppercase leading-[0.95] tracking-tighter sm:text-3xl">{copy.headline}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{copy.blurb}</p>
        </div>

        <ul className="space-y-2.5">
          {copy.preview.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm font-bold">
              <Check aria-hidden className="h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
          {copy.locked.map((item) => (
            <li key={item} className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
              <Lock aria-hidden className="h-4 w-4 shrink-0" />
              <span className="sr-only">Locked: </span>
              <span aria-hidden={false} className="select-none blur-[3.5px]">{item}</span>
            </li>
          ))}
        </ul>

        <div className="space-y-3 border-t border-border/20 pt-6">
          <p className="flex items-baseline gap-2">
            <span className="text-4xl font-black tabular-nums tracking-tighter">{PRICE_LABEL}</span>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">one-time</span>
          </p>
          <button
            type="button"
            onClick={() => {
              trackOfferClicked(major, planType);
              setOpen(true);
            }}
            className="w-full rounded-full bg-primary px-6 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground shadow-xl transition hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
          >
            {copy.cta}
          </button>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            One payment, no subscription. Your score, roast, sharing and comparisons always stay free.
          </p>
        </div>
      </div>

    </div>
    {dialog}
    </>
  );
}
