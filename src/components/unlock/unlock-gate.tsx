"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BrainCircuit, Loader2, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { PAYMENTS_MODE } from "@/lib/premium";
import { SITE_HOST } from "@/lib/site";
import type { ExperimentView } from "@/lib/unlock/shared";
import { setUnlockGated, trackUnlock, trackUnlockPurchase } from "@/lib/unlock/analytics";

// The paid-unlock experiment, in front of the result. While it runs, the result (score, roast, card, everything under it) is
// not drawn until the SERVER says this browser has paid to see it. What the visitor sees meanwhile is the same card, masked:
// the real score and roast are never put on the page, only blurred stand-ins. Paying goes through the same providers as the
// plan (Stripe in dollars, Paystack in cedis, a fake checkout in test mode) and only /api/unlock/verify can unlock.
// With no experiment running this renders its children and does nothing else.

type Phase = "checking" | "locked" | "unlocked";

type Step =
  | { name: "idle" }
  | { name: "starting" }
  | { name: "mock"; reference: string }
  | { name: "redirecting"; url: string }
  | { name: "processing"; reference: string; proof?: string; session?: string }
  | { name: "pending"; reference: string; proof?: string; session?: string }
  | { name: "failed"; reason: string }
  | { name: "cancelled" }
  | { name: "error"; message: string };

interface Status {
  active: boolean;
  unlocked: boolean;
  gated?: boolean;
  provider?: "mock" | "paystack" | "stripe";
  price?: { label: string; currency: string; value: number };
  approx?: string;
}

const EMAIL = /^\S+@\S+\.\S{2,}$/;
const REFERENCE = /^cm-[a-z0-9]{6,12}-[a-f0-9]{12}$/;
const POLL_MS = 2000;
const POLL_TRIES = 5;

const FAILURE_TEXT: Record<string, string> = {
  card_declined: "The payment was declined. You have not been charged.",
  payment_declined: "The payment was declined. You have not been charged.",
  wrong_amount: "The amount did not match, so nothing was unlocked.",
  wrong_product: "That payment was for something else, so nothing was unlocked.",
  no_payment_found: "We could not find a payment to confirm.",
  expired: "That payment session expired. Please start again.",
  refunded: "That payment was refunded, so it no longer unlocks this result.",
};

/** Coming back from the payment page: the address carries ?cm_unlock=1&reference=... for this major. */
function readResume(majorName: string): { reference: string; session?: string } | null {
  if (typeof window === "undefined") return null;
  const p = new URLSearchParams(window.location.search);
  const ref = p.get("reference") ?? p.get("trxref");
  if (!(p.get("cm_unlock") === "1" && p.get("major") === majorName && ref && REFERENCE.test(ref))) return null;
  const sid = p.get("sid");
  return { reference: ref, session: sid && /^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sid) ? sid : undefined };
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

interface Props {
  major: { name: string; score: number; level: string };
  experiment: ExperimentView | null;
  onLockedChange?: (locked: boolean) => void;
  children: React.ReactNode;
}

export function UnlockGate({ major, experiment, onLockedChange, children }: Props) {
  const reduceMotion = useReducedMotion();
  const ended = !!experiment && Date.parse(experiment.endsAt) <= Date.now(); // a page left open past the end: free again
  const running = !!experiment && !ended;

  const [phase, setPhase] = useState<Phase>(running ? "checking" : "unlocked");
  const [status, setStatus] = useState<Status | null>(null);
  const [checkFailed, setCheckFailed] = useState(false);
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [resume] = useState(() => (running ? readResume(major.name) : null));
  const [step, setStep] = useState<Step>(resume ? { name: "processing", reference: resume.reference, session: resume.session } : { name: "idle" });
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoreRef, setRestoreRef] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const paywallRef = useRef<HTMLElement>(null);

  // Ask the server whether this browser may see this result. The page never decides this by itself.
  const check = useCallback(async () => {
    setCheckFailed(false);
    try {
      const res = await fetch(`/api/unlock/status?major=${encodeURIComponent(major.name)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const s = (await res.json()) as Status;
      setStatus(s);
      if (s.gated) setUnlockGated(true);
      setPhase(!s.active || s.unlocked ? "unlocked" : "locked");
    } catch {
      setCheckFailed(true);
      setPhase("locked"); // when in doubt the result stays hidden; paying and retrying both still work
    }
  }, [major.name]);

  useEffect(() => {
    if (!running) {
      setPhase("unlocked");
      return;
    }
    check();
  }, [running, check]);

  useEffect(() => {
    onLockedChange?.(phase !== "unlocked");
  }, [phase, onLockedChange]);

  // Analytics: the assessment finished (the lock or the result is on screen), once
  useEffect(() => {
    if (running && phase !== "checking") trackUnlock("assessment_completed", major, { locked: phase === "locked" }, true);
  }, [running, phase, major]);

  // Analytics: the paywall was really on screen
  useEffect(() => {
    const el = paywallRef.current;
    if (!el || phase !== "locked") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          trackUnlock("paywall_viewed", major, {}, true);
          io.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase, major]);

  const priceLabel = status?.price?.label ?? experiment?.priceLabel ?? "$1.99";
  const approx = status?.approx ?? experiment?.approxLabel;

  const finishUnlocked = useCallback(
    (via: "payment" | "restore") => {
      trackUnlock("result_unlocked", major, { via }, true);
      setJustUnlocked(true);
      setPhase("unlocked");
      setStep({ name: "idle" });
      try {
        const url = new URL(window.location.href);
        ["cm_unlock", "reference", "trxref", "sid"].forEach((k) => url.searchParams.delete(k));
        window.history.replaceState(null, "", url);
      } catch {}
    },
    [major]
  );

  // 1. Start: the server decides the price and makes the reference
  const start = async () => {
    if (!EMAIL.test(email.trim())) return setEmailError(true);
    setEmailError(false);
    trackUnlock("unlock_checkout_clicked", major, { price: status?.price?.value ?? 1.99, currency: status?.price?.currency ?? "USD" });
    setStep({ name: "starting" });
    try {
      const { ok, status: code, data } = await post("/api/unlock/initialize", { major: major.name, email: email.trim() });
      if (code === 409) {
        // already unlocked in another tab, or the plan is owned: just ask again
        return void check();
      }
      if (code === 404 && data?.error === "experiment_ended") {
        return setStep({ name: "error", message: "The experiment just ended: results are free again. Refresh the page." });
      }
      if (code === 429) {
        return setStep({ name: "error", message: "Too many attempts from this connection. Please wait a few minutes and try again." });
      }
      if (!ok || !data.reference) {
        trackUnlock("payment_failed", major, { failure_reason: String(data?.error ?? "could_not_start") });
        const why = typeof data?.detail === "string" ? ` [${data.detail}]` : "";
        return setStep({ name: "error", message: `We could not start the payment. Please try again in a moment.${why}` });
      }
      if (data.authorizationUrl) {
        setStep({ name: "redirecting", url: data.authorizationUrl });
        window.location.assign(data.authorizationUrl); // the payment page, then back to this result
        return;
      }
      setStep({ name: "mock", reference: data.reference }); // test mode: a stand-in payment page
    } catch {
      trackUnlock("payment_failed", major, { failure_reason: "network" });
      setStep({ name: "error", message: "Network problem. Check your connection and try again." });
    }
  };

  // Test mode only: choose what the fake payment does
  const chooseMock = async (reference: string, outcome: "success" | "failed" | "cancelled" | "slow") => {
    if (outcome === "cancelled") return setStep({ name: "cancelled" });
    setStep({ name: "processing", reference });
    try {
      const { ok, data } = await post("/api/unlock/mock", { major: major.name, reference, outcome });
      if (!ok || !data.proof) return setStep({ name: "error", message: "The test checkout could not respond. Try again." });
      setStep({ name: "processing", reference, proof: data.proof });
    } catch {
      setStep({ name: "error", message: "Network problem. Check your connection and try again." });
    }
  };

  // Restore a payment already made (a cleared cookie, a new browser): the payment reference from the receipt
  const restore = () => {
    const value = restoreRef.trim().toLowerCase();
    if (!REFERENCE.test(value)) return setRestoreError("Enter your payment reference (it starts with cm-).");
    setRestoreError("");
    setStep({ name: "processing", reference: value });
  };

  // 2. Ask the server (which asks the provider) until it is sure. Only a verified success unlocks.
  useEffect(() => {
    if (step.name !== "processing") return;
    if (PAYMENTS_MODE === "test" && !step.proof && !restoring) return; // the fake checkout waits for its proof
    let cancelled = false;
    const { reference, proof, session } = step;
    (async () => {
      for (let attempt = 0; attempt < POLL_TRIES; attempt++) {
        if (cancelled) return;
        try {
          const { data } = await post("/api/unlock/verify", { major: major.name, reference, proof, session });
          if (cancelled) return;
          if (data.status === "success") {
            trackUnlock("payment_succeeded", major, { value: Number(data.value ?? 0), currency: String(data.currency ?? "") });
            trackUnlockPurchase(major, String(data.transactionId ?? reference), Number(data.value ?? 0), String(data.currency ?? "USD"));
            return finishUnlocked(restoring ? "restore" : "payment");
          }
          if (data.status === "failed") {
            const reason = String(data.reason ?? "payment_declined");
            trackUnlock("payment_failed", major, { failure_reason: reason });
            return setStep({ name: "failed", reason });
          }
          if (data.status === "cancelled") return setStep({ name: "cancelled" });
          if (data.status === "error") return setStep({ name: "pending", reference, proof, session });
          // "pending": wait and ask again
        } catch {
          if (cancelled) return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) setStep({ name: "pending", reference, proof, session });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Coming back with the browser's Back button from the payment page: the page is frozen on "Taking you to the payment page"
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setStep((s) => (s.name === "redirecting" ? { name: "idle" } : s));
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  if (phase === "unlocked") {
    return (
      <motion.div initial={justUnlocked && !reduceMotion ? { opacity: 0, y: 14 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: "easeOut" }}>
        {children}
      </motion.div>
    );
  }

  const busy = step.name === "starting" || step.name === "redirecting" || step.name === "processing";
  const label = `UNLOCK MY RESULTS — ${priceLabel}`;

  return (
    <div className="mx-auto w-full max-w-[420px]">
      <LockedCard major={major} />

      <section ref={paywallRef} aria-labelledby="unlock-title" className="mt-6 rounded-3xl border border-primary/30 bg-card/70 p-5 text-center backdrop-blur-xl sm:p-6">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Result locked</p>
        <h2 id="unlock-title" className="mt-2 text-3xl font-black uppercase italic leading-[0.95] tracking-tighter sm:text-4xl">
          Your major has been judged.
        </h2>
        <p className="mt-3 text-base font-bold">The verdict is in. Are you ready to see it?</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your cooked score, personalized roast, survival level, and shareable result card are waiting behind the lock.
        </p>

        <p className="mt-5 text-xl font-black tracking-tight">Unlock your results for {priceLabel}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">One-time payment. No subscription.</p>
        {approx && <p className="mt-1 text-xs text-muted-foreground">That is about {approx}, charged in cedis in Ghana.</p>}

        {checkFailed && (
          <p role="alert" className="mt-4 text-xs font-bold text-amber-400">
            We could not check your unlock status.{" "}
            <button type="button" onClick={check} className="underline underline-offset-2">
              Try again
            </button>
          </p>
        )}

        {step.name === "mock" ? (
          <div className="mt-5 space-y-2 rounded-2xl border border-amber-400/40 bg-amber-400/10 p-4 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-amber-300">Test checkout (no money moves)</p>
            {(
              [
                ["success", "Pay"],
                ["failed", "Card declined"],
                ["slow", "Slow payment"],
                ["cancelled", "Cancel"],
              ] as const
            ).map(([outcome, text]) => (
              <button key={outcome} type="button" onClick={() => chooseMock(step.reference, outcome)} className="w-full rounded-full border border-amber-400/40 px-4 py-2.5 text-xs font-black uppercase tracking-widest transition hover:bg-amber-400/20">
                {text}
              </button>
            ))}
          </div>
        ) : step.name === "pending" ? (
          <div className="mt-5 space-y-3">
            <p role="status" className="text-sm text-muted-foreground">
              We are still waiting for the payment provider to confirm. Nothing is lost: if you paid, your result unlocks as soon as it does.
            </p>
            <button type="button" onClick={() => setStep({ name: "processing", reference: step.reference, proof: step.proof, session: step.session })} className="w-full rounded-full bg-[#FFE0C3] px-6 py-3.5 text-sm font-black uppercase tracking-widest text-[#0C0C0C]">
              Check again
            </button>
          </div>
        ) : (
          <form
            className="mt-5 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!busy) start();
            }}
            noValidate
          >
            <label className="sr-only" htmlFor="unlock-email">
              Email for your payment receipt
            </label>
            <input
              id="unlock-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={120}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              aria-invalid={emailError}
              placeholder="you@email.com (for your receipt)"
              className="w-full rounded-full border border-border bg-background px-5 py-3 text-center text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-60"
            />
            {emailError && (
              <p role="alert" className="text-xs font-bold text-red-400">
                Enter a valid email so the payment page can send your receipt.
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#FFE0C3] px-6 py-4 text-sm font-black uppercase tracking-widest text-[#0C0C0C] transition hover:bg-[#FFD3AB] active:scale-95 disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
            >
              {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Lock aria-hidden className="h-4 w-4" />}
              <span aria-live="polite">
                {step.name === "starting" ? "STARTING..." : step.name === "redirecting" ? "TAKING YOU TO THE PAYMENT PAGE..." : step.name === "processing" ? "CONFIRMING YOUR PAYMENT..." : label}
              </span>
            </button>
          </form>
        )}

        {step.name === "failed" && (
          <p role="alert" className="mt-3 text-sm font-bold text-red-400">
            {FAILURE_TEXT[step.reason] ?? "The payment did not go through, so nothing was unlocked."}
          </p>
        )}
        {step.name === "cancelled" && (
          <p role="status" className="mt-3 text-sm text-muted-foreground">
            Payment cancelled. You have not been charged.{" "}
            <button type="button" onClick={() => setStep({ name: "idle" })} className="font-bold underline underline-offset-2">
              Try again
            </button>
          </p>
        )}
        {step.name === "error" && (
          <p role="alert" className="mt-3 text-sm font-bold text-red-400">
            {step.message}
          </p>
        )}

        <p className="mt-4 flex items-center justify-center gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          Secure payment{status?.provider === "stripe" ? " by Stripe" : status?.provider === "paystack" ? " by Paystack" : ""}. Charged but not unlocked? Contact us and we will refund you.
        </p>

        {/* Already paid: a cleared browser or a new phone */}
        <div className="mt-3 border-t border-border/30 pt-3">
          {restoring ? (
            <div className="space-y-2 text-left">
              <label htmlFor="unlock-restore" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                Your payment reference (it starts with cm-)
              </label>
              <input
                id="unlock-restore"
                value={restoreRef}
                onChange={(e) => setRestoreRef(e.target.value)}
                placeholder="cm-..."
                autoComplete="off"
                className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              />
              {restoreError && (
                <p role="alert" className="text-xs font-bold text-red-400">
                  {restoreError}
                </p>
              )}
              <button type="button" onClick={restore} className="w-full rounded-full border border-border px-4 py-2.5 text-xs font-black uppercase tracking-widest transition hover:bg-muted">
                Restore my result
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setRestoring(true)} className="text-xs font-bold text-muted-foreground underline underline-offset-4 hover:text-foreground">
              Already paid? Restore your result
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * The result card with its numbers masked. Same size and shape as the real card, so nothing jumps when it unlocks. The real
 * score, status, pay, growth and roast are NOT in this markup: the blurred shapes are placeholders, not the values.
 */
function LockedCard({ major }: { major: { name: string } }) {
  return (
    <BackgroundGradient containerClassName="w-full max-w-[400px] mx-auto rounded-[30px]" className="rounded-[26px] sm:rounded-[32px]">
      <div
        role="img"
        aria-label={`The result for ${major.name} is locked`}
        className="relative flex min-h-[300px] w-full flex-col justify-between overflow-clip rounded-[26px] border-2 border-foreground bg-card p-4 text-foreground sm:aspect-[4/5] sm:rounded-[32px] sm:border-4 sm:p-6"
      >
        <div aria-hidden className="absolute left-4 top-3 flex items-center gap-2 opacity-30 sm:left-6 sm:top-5">
          <BrainCircuit className="h-2 w-2 sm:h-3 sm:w-3" />
          <span className="text-[6px] font-black uppercase tracking-widest sm:text-[8px]">{SITE_HOST}</span>
        </div>

        <div className="relative flex flex-col pt-6 sm:flex-1">
          <div className="mb-2 flex items-start justify-between sm:mb-3">
            <div className="max-w-[75%]">
              <p className="mb-0.5 text-[6px] font-black uppercase tracking-[0.3em] text-muted-foreground sm:text-[9px]">Scan ID: locked</p>
              <h3 className="line-clamp-2 break-words text-[13px] font-black uppercase leading-tight tracking-tighter sm:line-clamp-3 sm:text-xl">{major.name}</h3>
            </div>
            <div className="shrink-0 rounded-lg bg-foreground p-1 text-background sm:rounded-2xl sm:p-3">
              <Sparkles className="h-3 w-3 fill-current sm:h-7 sm:w-7" />
            </div>
          </div>

          <div aria-hidden className="select-none">
            <div className="mb-1.5 grid grid-cols-2 gap-2 border-t border-foreground/10 pt-1.5 sm:mb-3 sm:pt-3">
              <div className="space-y-1.5">
                <p className="text-[5px] font-black tracking-[0.2em] text-muted-foreground sm:text-[8px]">AI RISK LEVEL</p>
                <div className="h-8 w-20 rounded-lg bg-foreground/25 blur-[7px] sm:h-12 sm:w-28" />
              </div>
              <div className="space-y-1.5 border-l border-foreground/10 pl-2 sm:pl-4">
                <p className="text-[5px] font-black tracking-[0.2em] text-muted-foreground sm:text-[8px]">SURVIVAL STATUS</p>
                <div className="h-4 w-24 rounded-md bg-foreground/25 blur-[6px] sm:h-6 sm:w-32" />
              </div>
            </div>
            <div className="mb-1.5 grid grid-cols-2 gap-2 border-t border-foreground/10 pt-1.5 sm:mb-3 sm:gap-6 sm:pt-3">
              <div className="space-y-1.5">
                <p className="text-[5px] font-black tracking-[0.2em] text-muted-foreground sm:text-[8px]">SALARY RANGE</p>
                <div className="h-3 w-24 rounded bg-foreground/20 blur-[5px] sm:h-4" />
              </div>
              <div className="space-y-1.5 border-l border-foreground/10 pl-2 sm:pl-4">
                <p className="text-[5px] font-black tracking-[0.2em] text-muted-foreground sm:text-[8px]">MARKET GROWTH</p>
                <div className="h-3 w-16 rounded bg-foreground/20 blur-[5px] sm:h-4" />
              </div>
            </div>
            <div className="mt-2 flex flex-col items-center justify-center gap-2 border-t-2 border-dashed border-foreground/10 py-3 sm:mt-0 sm:flex-1">
              <div className="h-2.5 w-[88%] rounded-full bg-foreground/20 blur-[4px]" />
              <div className="h-2.5 w-[70%] rounded-full bg-foreground/20 blur-[4px]" />
              <div className="h-2.5 w-[80%] rounded-full bg-foreground/20 blur-[4px]" />
            </div>
          </div>
        </div>

        {/* The lock */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/45 backdrop-blur-[3px]">
          <span className="grid h-14 w-14 place-items-center rounded-full border-2 border-foreground bg-card sm:h-16 sm:w-16">
            <Lock aria-hidden className="h-6 w-6 sm:h-7 sm:w-7" />
          </span>
          <span className="text-[11px] font-black uppercase tracking-[0.3em]">Locked</span>
        </div>
      </div>
    </BackgroundGradient>
  );
}
