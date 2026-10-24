"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Check, Lock, ShieldCheck } from "lucide-react";
import type { Major } from "@/lib/data";
import { markInternal, slugify } from "@/lib/analytics";
import { DEFAULT_PRICE, PAYMENTS_MODE, PLAN_COPY, offerCopy, planTypeFor, type Price } from "@/lib/premium";
import { notifyStep, notifyUnlockClicked, setGated, setPrice, trackOfferClicked, trackOfferViewed, trackReportUnlocked, trackStickyCtaClicked } from "@/lib/premium-analytics";
import type { Plan } from "@/lib/plan/types";
import type { PlanPreview } from "@/lib/plan/preview";
import { CheckoutDialog } from "./checkout-dialog";
import { PlanReport } from "./plan-report";
import { PointingHand } from "./pointing-hand";
import { StickyCta } from "./sticky-cta";
import { BundlePicker } from "./bundle-picker";
import { PlanBook } from "./plan-book";
import { majors as allMajors } from "@/lib/data";

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
function readResume(majorName: string): { reference: string; session?: string; bundle?: string[] } | undefined {
  if (typeof window === "undefined") return undefined;
  const p = new URLSearchParams(window.location.search);
  const ref = p.get("reference") ?? p.get("trxref");
  if (!(p.get("cm_checkout") === "1" && p.get("major") === majorName && ref && /^cm-[a-z0-9]{6,12}-[a-f0-9]{12}$/.test(ref))) return undefined;
  const sid = p.get("sid"); // Stripe's Checkout Session id, when the buyer paid with Stripe
  // A 3-major bundle carries its three names (the server checks them again when confirming)
  const names = p.get("cm_bundle")?.split("|") ?? [];
  const bundle = names.length === 3 && names[0] === majorName ? names : undefined;
  return { reference: ref, session: sid && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid) ? sid : undefined, bundle };
}

// Asks the server once per page load whether THIS visitor may see the offer: payments on, and if the private gate is
// closed, the browser must carry the gate cookie. Anything unclear means "hide it".
// `unlocked` = the majors this browser's (year-long) unlock cookie covers, so a buyer who comes back, even after
// closing the app, sees their plan straight away instead of the buy button.
// `price` = what a buyer is charged right now, from the server's own payment settings; the charge is always this.
// `approx` = a dollar amount ("US$4.99") the server sends only to visitors outside Ghana. They see it as the headline
// price (a guide), with a line under it saying what is really charged in cedis, so nothing is hidden before the
// payment page. It never changes what is charged.
export type LaunchInfo = { regular: Price; endsAt: string; regularApprox?: string; kind?: "comeback" };

// The comeback offer (30% off for 24 hours, once): asked for when this browser is back at the paywall on a LATER visit, at
// least 30 minutes after it first saw it. The server decides whether there is an offer and signs it into a cookie; this only
// notices the visit. Remembered in this browser only (localStorage), never sent anywhere else.
const FIRST_SEEN_KEY = "cm_paywall_first_seen";
const ASKED_KEY = "cm_comeback_asked";
const SESSION_KEY = "cm_paywall_this_visit";
const LATER_VISIT_MS = 30 * 60 * 1000;

function isComebackVisit(): boolean {
  try {
    const now = Date.now();
    const thisVisit = sessionStorage.getItem(SESSION_KEY);
    sessionStorage.setItem(SESSION_KEY, "1");
    const first = Number(localStorage.getItem(FIRST_SEEN_KEY));
    if (!first) {
      localStorage.setItem(FIRST_SEEN_KEY, String(now));
      return false;
    }
    if (thisVisit || localStorage.getItem(ASKED_KEY)) return false;
    return now - first >= LATER_VISIT_MS;
  } catch {
    return false;
  }
}
type BundleInfo = { price: Price; approx?: string };
type Status = { enabled: boolean; gated: boolean; unlocked?: string[]; price?: Price; approx?: string; launch?: LaunchInfo; provider?: "stripe" | "paystack"; bundle?: BundleInfo };
let statusRequest: Promise<Status> | null = null;
function refreshStatus() {
  statusRequest = null;
  return fetchStatus();
}
function fetchStatus() {
  statusRequest ??= fetch("/api/payments/status", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : { enabled: false, gated: false }))
    .catch(() => ({ enabled: false, gated: false }));
  return statusRequest;
}

export function PremiumOffer({ major }: { major: Major }) {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    if (PAYMENTS_MODE === "off") return;
    let live = true;
    fetchStatus().then((s) => {
      setGated(s.gated);
      if (s.price) setPrice(s.price); // GA4 events carry the amount and currency really charged
      // Only the owner gets past the private gate, so this browser's visits are tests: keep them out of the real numbers
      if (s.gated && s.enabled) markInternal();
      if (live) setStatus(s);
    });
    return () => {
      live = false;
    };
  }, []);
  // When a launch discount ends, ask the server again at that moment (a little after it), so the page drops the discount
  // by itself instead of showing a price that is no longer charged. Timers cannot be longer than about 24 days: for a
  // launch further away than that, this simply checks again then.
  const endsAt = status?.launch?.endsAt;
  useEffect(() => {
    if (!endsAt) return;
    const wait = Math.min(new Date(endsAt).getTime() - Date.now() + 1500, 2_000_000_000);
    const id = setTimeout(() => {
      refreshStatus().then((s) => {
        if (s.price) setPrice(s.price);
        setStatus(s);
      });
    }, Math.max(wait, 0));
    return () => clearTimeout(id);
  }, [endsAt]);
  // Called once the offer card has really been on screen
  const onViewed = useCallback(() => {
    if (!isComebackVisit()) return;
    try {
      localStorage.setItem(ASKED_KEY, "1");
    } catch {}
    fetch("/api/payments/comeback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ major: major.name }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { active?: boolean } | null) => {
        if (!d?.active) return;
        refreshStatus().then((s) => {
          if (s.price) setPrice(s.price);
          setStatus(s);
        });
      })
      .catch(() => {});
  }, [major.name]);
  if (PAYMENTS_MODE === "off" || !status?.enabled) return null;
  return <Offer key={major.name} major={major} unlocked={status.unlocked ?? []} price={status.price ?? DEFAULT_PRICE} approx={status.approx} launch={status.launch} provider={status.provider} gated={status.gated} onViewed={onViewed} bundleInfo={status.bundle} />;
}

// The real preview of the plan for this major (two recommendations and counts), from /api/plan/preview. If it cannot be
// fetched the card simply falls back to the short list it always had: it never shows made-up placeholders.
function usePreview(majorName: string): PlanPreview | null {
  const [preview, setPreview] = useState<PlanPreview | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/plan/preview?major=${encodeURIComponent(majorName)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { preview?: PlanPreview } | null) => live && d?.preview && setPreview(d.preview))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [majorName]);
  return preview;
}

function Offer({ major, unlocked, price, approx, launch, provider, gated, onViewed, bundleInfo }: { major: Major; unlocked: string[]; price: Price; approx?: string; launch?: LaunchInfo; provider?: "stripe" | "paystack"; gated: boolean; onViewed?: () => void; bundleInfo?: BundleInfo }) {
  const planType = planTypeFor(major.score);
  const copy = PLAN_COPY[planType];
  const words = offerCopy(planType, major.name, major.score);
  const shortName = major.name.length <= 34 ? major.name : "your major";
  const slug = slugify(major.name);

  const [resume] = useState(() => readResume(major.name));
  const [open, setOpen] = useState(!!resume);
  // The 3-major bundle: the picker, then the checkout for all three (also when coming back from the payment page)
  const [picking, setPicking] = useState(false);
  const [bundleMajors, setBundleMajors] = useState<Major[] | null>(() =>
    resume?.bundle ? (resume.bundle.map((n) => allMajors.find((m) => m.name === n)).filter(Boolean) as Major[]) : null
  );
  const providerName = provider === "stripe" ? "Stripe" : "Paystack";
  const [plan, setPlan] = useState<Plan | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const planRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [buttonOnScreen, setButtonOnScreen] = useState(true);
  const preview = usePreview(major.name);

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
          if (!gated) notifyStep("paywall_viewed", major); // visits by the owner behind the private gate are not announced
          onViewed?.();
          io.disconnect();
        }
      },
      // A share of the card's own area, not half of it: the card is taller than a phone screen once the plan preview is
      // in it, and half of it can never be on screen at once. 15% is about what half of the old, shorter card was.
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [major, planType, plan, gated, onViewed]);

  // Is the card's own button on screen? It decides whether the bar pinned to the bottom of a phone is shown (below).
  // It starts as "yes", so the bar never flashes in before this is known. The bottom 88px are left out of the
  // measurement, so the button only counts as visible once it is clear of where the bar sits.
  useEffect(() => {
    const el = buttonRef.current;
    if (!el || plan) return;
    const io = new IntersectionObserver((entries) => setButtonOnScreen(entries.some((e) => e.isIntersecting)), { rootMargin: "0px 0px -88px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [plan]);

  // Back to the result later (even after closing the browser): show the plan again if this browser already paid for it.
  // The server says which majors the cookie covers; the plan itself is still only served if the unlock is valid.
  useEffect(() => {
    if (!unlocked.includes(slug) && !unlockedSlugs().includes(slug)) return;
    const id = setTimeout(loadPlan, 0);
    return () => clearTimeout(id);
  }, [slug, loadPlan, unlocked]);

  // Returning from the payment page: tidy the address so a reload does not start a second check
  useEffect(() => {
    if (!resume) return;
    const url = new URL(window.location.href);
    ["cm_checkout", "reference", "trxref", "sid", "cm_bundle"].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState(null, "", url);
  }, [resume]);

  const viewPlan = () => {
    setOpen(false);
    setTimeout(() => planRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  };

  // The bar on phones: only while payments are open to the public (not gated), this browser has not already bought the
  // plan, the checkout is closed, and the card's own button is off-screen. The tap opens the same checkout, and is
  // counted as its own event (premium_sticky_cta_clicked), not as a click on the card's button.
  const owned = unlocked.includes(slug) || unlockedSlugs().includes(slug);
  const showSticky = !gated && !owned && !plan && !open && !buttonOnScreen;
  const unlockFromBar = () => {
    trackStickyCtaClicked(major, planType);
    notifyUnlockClicked(major);
    setBundleMajors(null);
    setOpen(true);
  };

  // The checkout sits outside the card and the report, so it stays on screen while the report loads behind it
  const dialog = (
    <AnimatePresence>
      {open && (
        <CheckoutDialog
          major={major}
          planType={planType}
          price={price}
          approx={approx}
          launch={launch}
          resumeReference={resume?.reference}
          resumeSession={resume?.session}
          bundle={bundleMajors && bundleMajors.length === 3 ? { majors: bundleMajors, price: bundleInfo?.price, approx: bundleInfo?.approx } : undefined}
          onPaid={loadPlan}
          onClose={() => {
            setOpen(false);
            setBundleMajors(null);
          }}
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

      <div className="offer-grid relative space-y-6">
        {/* The product as a product: their plan's cover and a real page from inside, like a store page */}
        <PlanBook major={major} preview={preview} />

        <div className="offer-head space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">{copy.eyebrow}</p>
            {PAYMENTS_MODE === "test" && (
              <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-amber-300">
                Test mode
              </span>
            )}
          </div>
          <h3 className="text-2xl font-black italic uppercase leading-[0.95] tracking-tighter sm:text-3xl">{words.headline}</h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{words.blurb}</p>
        </div>

        {/* What is inside, short: three lines, every number counted from the plan the buyer actually gets for this major */}
        <ul className="offer-list space-y-1.5">
          {insideList(preview, copy.preview).map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm font-bold">
              <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>

        <div className="offer-buy space-y-3 border-t border-border/20 pt-5">
          {launch && <LaunchBadge launch={launch} />}
          <p className="flex flex-wrap items-baseline gap-x-2">
            {launch && <span className="text-lg font-bold tabular-nums text-muted-foreground line-through decoration-2">{launch.regularApprox ?? launch.regular.label}</span>}
            <span className="text-4xl font-black tabular-nums tracking-tighter">{approx ?? price.label}</span>
            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">one payment</span>
          </p>
          {approx && (
            // Only sent to visitors outside Ghana: the headline above is the dollar guide, this line says what is really charged
            <p className="text-xs leading-relaxed text-muted-foreground">
              You are charged {price.label} (Ghana cedis). Your bank converts it, so your statement may differ a little.
            </p>
          )}
          <ul className="space-y-1 text-xs font-bold text-foreground/90">
            <li className="flex items-center gap-2"><Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-emerald-500" />Instant access, no account, no subscription</li>
            <li className="flex items-center gap-2"><Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-emerald-500" />Built from {shortName}&apos;s own score, pay and growth data</li>
            <li className="flex items-center gap-2"><Check aria-hidden className="h-3.5 w-3.5 shrink-0 text-emerald-500" />Download it as a PDF and keep it</li>
          </ul>
          {/* The glove points at the button below it. The space above the button is always reserved, so it never shifts the page. */}
          <div className="relative pt-[4.5rem]">
            <PointingHand className="absolute right-8 top-0" />
            <button
              ref={buttonRef}
              type="button"
              onClick={() => {
                trackOfferClicked(major, planType);
                notifyUnlockClicked(major);
                setBundleMajors(null);
                setOpen(true);
              }}
              className={
                "w-full rounded-full px-6 py-4 text-sm font-black uppercase tracking-widest transition hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card " +
                // Under 30 the visitor is a sharer more than a buyer: the share buttons above are the main action, the plan is the quieter one
                (major.score < 30 ? "border border-primary/60 bg-transparent text-primary" : "bg-primary text-primary-foreground shadow-xl")
              }
            >
              {copy.cta}
            </button>
          </div>
          {bundleInfo &&
            (picking ? (
              <BundlePicker
                current={major}
                priceLabel={bundleInfo.approx ?? bundleInfo.price.label}
                onCancel={() => setPicking(false)}
                onContinue={(three) => {
                  setPicking(false);
                  setBundleMajors(three);
                  notifyUnlockClicked(major);
                  setOpen(true);
                }}
              />
            ) : (
              <button type="button" onClick={() => setPicking(true)} className="w-full text-center text-xs font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Choosing between majors? Get plans for 3 for {bundleInfo.approx ?? bundleInfo.price.label}
              </button>
            ))}
          <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
            <p>
              <span className="font-bold text-foreground">7-day guarantee:</span> not worth what you paid? Tell us within 7 days and we refund you in full. No forms. Charged but no plan, or charged twice? Refunded too.{" "}
              <a href="/refunds" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Refund policy</a>
            </p>
            <p className="flex items-start gap-1.5">
              <ShieldCheck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
              <span>
                <span className="font-bold text-foreground">Secure payment by {providerName}.</span> Run by MajorLabs Intelligence ·{" "}
                <a href="/contact" className="underline underline-offset-2 hover:text-foreground">Contact</a> ·{" "}
                <a href="https://twitter.com/cookedlabs_cto" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">@cookedlabs_cto</a>
              </span>
            </p>
          </div>
        </div>

        {preview && (
          // The real taste is one tap away instead of making every visitor scroll past it. Native details/summary: no script, works with a keyboard.
          <details className="offer-peek group rounded-2xl border border-border/60 bg-background/50 p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-black [&::-webkit-details-marker]:hidden">
              <span>See 2 real recommendations from your plan, free</span>
              <span aria-hidden className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mb-3 mt-3 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              2 of {preview.counts.careerPaths} career paths for {major.name.length <= 34 ? major.name : "your major"}
            </p>
            <ul className="space-y-3">
              {preview.visible.map((item) => (
                <li key={item.title}>
                  <p className="text-sm font-black leading-snug">{item.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.why}</p>
                </li>
              ))}
            </ul>
            {preview.counts.careerPaths > preview.visible.length && (
              <div className="mt-3 space-y-2">
                {Array.from({ length: Math.min(3, preview.counts.careerPaths - preview.visible.length) }).map((_, i) => (
                  // Placeholder bars, not blurred real text: the locked wording is never sent to the browser
                  <div key={i} aria-hidden className="flex items-center gap-2">
                    <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="h-3 rounded-full bg-muted-foreground/20 blur-[1.5px]" style={{ width: `${84 - i * 17}%` }} />
                  </div>
                ))}
                <p className="text-[11px] font-bold text-muted-foreground">
                  + {preview.counts.careerPaths - preview.visible.length} more career paths, the skills, tools, projects and the full roadmap unlock after payment.
                </p>
              </div>
            )}
          </details>
        )}
      </div>

    </div>
    {dialog}
    <StickyCta show={showSticky} price={price} approx={approx} label={`Get your ${shortName} plan`} onClick={unlockFromBar} />
    </>
  );
}


/** The "what's inside" lines: real counts from the preview when it loaded, otherwise the short list the plan always had. */
export function insideList(preview: PlanPreview | null, fallback: string[]): string[] {
  if (!preview) return fallback;
  const c = preview.counts;
  return [
    ...(c.realJobs ? [`${c.realJobs} real jobs with their actual pay${preview.teaserJob ? ` (e.g. ${preview.teaserJob.title}: ${preview.teaserJob.pay})` : ""}`] : []),
    `A 30/60/90-day roadmap (${c.roadmapSteps} steps) and ${c.projects} portfolio projects`,
    `${c.skills} skills and ${c.aiTools} AI tools to learn, with links, plus free courses and ready-made job searches`,
    "Your AI exposure, task by task, and a PDF you can keep",
  ];
}


/**
 * "Launch price" with the REAL end: the date and time the server will stop charging it, and how long is left, counted from
 * the end the server reported. It updates once a minute, and the page asks the server again when the end passes, so it
 * never shows time that is not really left.
 */
function LaunchBadge({ launch }: { launch: LaunchInfo }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(launch.endsAt);
  const ms = end.getTime() - now;
  if (ms <= 0) return null;
  const hours = Math.ceil(ms / 3_600_000);
  const minutes = Math.max(1, Math.ceil(ms / 60_000));
  const left =
    ms < 3_600_000 ? `${minutes} ${minutes === 1 ? "minute" : "minutes"} left` : hours <= 24 ? `${hours} ${hours === 1 ? "hour" : "hours"} left` : `${Math.ceil(hours / 24)} days left`;
  const when = end.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <p className="inline-flex flex-wrap items-center gap-x-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-primary">
      <span>{launch.kind === "comeback" ? "You came back: 30% off" : "Launch price"}</span>
      <span className="text-foreground/80">ends {when} · {left}</span>
    </p>
  );
}
