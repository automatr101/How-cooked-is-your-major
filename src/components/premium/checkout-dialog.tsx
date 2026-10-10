"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Lock, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SuccessIcon } from "@/components/ui/animated-state-icons";
import { PAYMENTS_MODE, PLAN_COPY, PRODUCT_NAME, type PlanType, type Price } from "@/lib/premium";
import { trackCheckoutStarted, trackPaid, trackPaymentCancelled, trackPaymentFailed } from "@/lib/premium-analytics";

// The checkout. In test mode it draws a stand-in for the payment page with buttons for every outcome;
// in live mode it sends the visitor to Paystack and picks them up again when they return. Either way the
// plan is unlocked only after /api/checkout/verify says the payment is real.

type Step =
  | { name: "review" }
  | { name: "starting" }
  | { name: "mock"; reference: string }
  | { name: "redirecting" }
  | { name: "processing"; reference: string; proof?: string }
  | { name: "pending"; reference: string; proof?: string }
  | { name: "success" }
  | { name: "failed"; reason: string }
  | { name: "cancelled" }
  | { name: "error"; message: string };

type Outcome = "success" | "failed" | "cancelled" | "slow";

export interface CheckoutMajor {
  name: string;
  score: number;
  level: string;
}

interface Props {
  major: CheckoutMajor;
  planType: PlanType;
  /** What they are charged, shown in the review step (it comes from the server's payment settings). */
  price: Price;
  /** A dollar amount ("US$4.99") for visitors outside Ghana, shown as the headline price with the cedi charge stated under it. Never what is charged. */
  approx?: string;
  /** Set when the visitor comes back from the payment page: go straight to confirming this payment. */
  resumeReference?: string;
  /** Called once the payment is confirmed. Must load the plan; the dialog then shows "ready". */
  onPaid: () => Promise<boolean>;
  onClose: () => void;
  /** Called after the visitor is told the plan is ready and presses the button. */
  onViewPlan: () => void;
}

const EMAIL = /^\S+@\S+\.\S{2,}$/;
const POLL_MS = 2000;
const POLL_TRIES = 5;

const FAILURE_TEXT: Record<string, string> = {
  card_declined: "The payment was declined. You have not been charged.",
  payment_declined: "The payment was declined. You have not been charged.",
  wrong_amount: "The amount did not match, so nothing was unlocked. You have not been charged for the plan.",
  wrong_product: "That payment was for something else, so nothing was unlocked.",
  no_payment_found: "We could not find a payment to confirm.",
  expired: "That payment session expired. Please start again.",
};

export function CheckoutDialog({ major, planType, price, approx, resumeReference, onPaid, onClose, onViewPlan }: Props) {
  const reduceMotion = useReducedMotion();
  const copy = PLAN_COPY[planType];
  const [step, setStep] = useState<Step>(resumeReference ? { name: "processing", reference: resumeReference } : { name: "review" });
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState(false);
  // "Already paid?" (live mode): a buyer who paid but never got back to the site enters the payment reference from their receipt
  const [restoring, setRestoring] = useState(false);
  const [restoreRef, setRestoreRef] = useState("");
  const [restoreError, setRestoreError] = useState("");
  const [restoreBusy, setRestoreBusy] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const closedRef = useRef(false); // so closing never counts twice, and a late response cannot reopen things
  const finished = step.name === "success";

  // Cancelled = left without paying. Reported once.
  const cancelAndClose = () => {
    if (!closedRef.current && !finished) trackPaymentCancelled(major, planType);
    closedRef.current = true;
    onClose();
  };

  // Escape closes; focus goes into the dialog and returns afterwards
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && step.name !== "starting" && step.name !== "redirecting") cancelAndClose();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step.name]);

  async function post(path: string, body: unknown) {
    const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  }

  // 1. review -> start. The server decides the price and makes the reference.
  const start = async () => {
    if (!EMAIL.test(email.trim())) return setEmailError(true);
    setEmailError(false);
    closedRef.current = false; // a new attempt: closing it again counts again
    setStep({ name: "starting" });
    try {
      const { ok, data } = await post("/api/checkout/initialize", { major: major.name, email: email.trim() });
      if (!ok || !data.reference) {
        trackPaymentFailed(major, planType, data?.error ?? "could_not_start");
        // `detail` only exists while the private gate is on (the owner testing), never for real visitors.
        const why = typeof data?.detail === "string" ? ` [${data.detail}]` : "";
        return setStep({ name: "error", message: `We could not start the payment. Please try again in a moment.${why}` });
      }
      trackCheckoutStarted(major, planType);
      if (data.authorizationUrl) {
        setStep({ name: "redirecting" });
        window.location.assign(data.authorizationUrl); // live mode: the payment page, then back to this site
        return;
      }
      setStep({ name: "mock", reference: data.reference }); // test mode: our stand-in payment page
    } catch {
      trackPaymentFailed(major, planType, "network");
      setStep({ name: "error", message: "Network problem. Check your connection and try again." });
    }
  };

  // Restore a plan that was already paid for. Either the payment reference (checked with Paystack, like a normal
  // payment) or the email used to pay (looked up on the server). Nothing unlocks unless the server confirms it.
  const restore = async () => {
    const value = restoreRef.trim();
    if (/^cm-[a-z0-9]{6,12}-[a-f0-9]{12}$/i.test(value)) {
      setRestoreError("");
      closedRef.current = false;
      return setStep({ name: "processing", reference: value.toLowerCase() });
    }
    if (!EMAIL.test(value)) return setRestoreError("Enter your payment reference (it starts with cm-) or the email you paid with.");
    setRestoreError("");
    setRestoreBusy(true);
    try {
      const { ok, status, data } = await post("/api/checkout/restore", { major: major.name, email: value });
      if (ok && data.status === "success") {
        trackPaid(major, planType, String(data.transactionId));
        closedRef.current = false;
        const ready = await onPaid();
        return setStep(ready ? { name: "success" } : { name: "error", message: "We found your payment but could not load the plan. Please try again." });
      }
      if (status === 429) return setRestoreError("Too many tries. Please wait a while, or use your payment reference.");
      if (status === 503) return setRestoreError("Restoring by email is not available right now. Use your payment reference instead.");
      setRestoreError("We could not find a paid plan for that email and this major. Check the email, or use your payment reference.");
    } catch {
      setRestoreError("Network problem. Check your connection and try again.");
    } finally {
      setRestoreBusy(false);
    }
  };

  // 2. test mode: choose what the fake payment does
  const chooseMock = async (reference: string, outcome: Outcome) => {
    if (outcome === "cancelled") {
      trackPaymentCancelled(major, planType);
      closedRef.current = true;
      return setStep({ name: "cancelled" });
    }
    setStep({ name: "processing", reference });
    try {
      const { ok, data } = await post("/api/checkout/mock", { major: major.name, reference, outcome });
      if (!ok || !data.proof) return setStep({ name: "error", message: "The test checkout could not respond. Try again." });
      setStep({ name: "processing", reference, proof: data.proof });
    } catch {
      setStep({ name: "error", message: "Network problem. Check your connection and try again." });
    }
  };

  // 3. confirm with the server (which asks the provider). Polls a few times, then shows "pending".
  useEffect(() => {
    if (step.name !== "processing") return;
    if (!step.reference) return;
    // Test mode waits for the proof before asking; live mode asks straight away.
    if (PAYMENTS_MODE === "test" && !step.proof) return;
    let cancelled = false;
    const { reference, proof } = step;

    (async () => {
      for (let attempt = 0; attempt < POLL_TRIES; attempt++) {
        if (cancelled) return;
        try {
          const { data } = await post("/api/checkout/verify", { major: major.name, reference, proof });
          if (cancelled) return;
          if (data.status === "success") {
            trackPaid(major, planType, String(data.transactionId ?? reference));
            const ready = await onPaid();
            if (cancelled) return;
            if (!ready) return setStep({ name: "error", message: "Your payment went through, but we could not load the plan. Press Try again, and you will not be charged twice." });
            return setStep({ name: "success" });
          }
          if (data.status === "failed") {
            const reason = String(data.reason ?? "payment_declined");
            trackPaymentFailed(major, planType, reason);
            return setStep({ name: "failed", reason });
          }
          if (data.status === "cancelled") {
            trackPaymentCancelled(major, planType);
            closedRef.current = true;
            return setStep({ name: "cancelled" });
          }
          if (data.status === "error") return setStep({ name: "pending", reference, proof }); // provider unreachable: not the visitor's fault
          // "pending": wait and ask again
        } catch {
          if (cancelled) return;
        }
        await new Promise((r) => setTimeout(r, POLL_MS));
      }
      if (!cancelled) setStep({ name: "pending", reference, proof });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const busy = step.name === "starting" || step.name === "redirecting" || step.name === "processing";

  return (
    <motion.div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) cancelAndClose();
      }}
    >
      <motion.div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-title"
        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-card p-6 shadow-2xl focus:outline-none sm:rounded-3xl sm:p-8"
      >
        {!busy && (
          <button
            type="button"
            onClick={cancelAndClose}
            aria-label="Close checkout"
            className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {PAYMENTS_MODE === "test" && (
          <div className="mb-5 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-[11px] font-black uppercase tracking-widest text-amber-300">
            Test mode. No real money moves.
          </div>
        )}

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Checkout</p>
        <h2 id="checkout-title" className="mt-1 text-2xl font-black italic uppercase leading-none tracking-tighter">
          {PRODUCT_NAME}
        </h2>

        <div aria-live="polite" className="mt-6">
          {step.name === "review" && (
            <div className="space-y-5">
              <div className="rounded-2xl border border-border bg-background/60 p-4">
                <div className="flex items-baseline justify-between gap-4">
                  <div>
                    <p className="text-sm font-black uppercase">{copy.name}</p>
                    <p className="text-xs text-muted-foreground">for {major.name}</p>
                  </div>
                  <p className="text-right">
                    <span className="text-2xl font-black tabular-nums">{approx ?? price.label}</span>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">one-time</span>
                  </p>
                </div>
                {approx && (
                  // Only sent to visitors outside Ghana: the headline above is the dollar guide, this says what the payment page will show
                  <p className="mt-3 border-t border-border/40 pt-3 text-[11px] leading-relaxed text-muted-foreground">
                    You are charged {price.label} (Ghana cedis) on the secure payment page that opens next. Your bank converts it at its own rate, so the amount on your statement may differ a little.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label htmlFor="checkout-email" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                  Email for your receipt
                </label>
                <input
                  id="checkout-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError(false);
                  }}
                  onKeyDown={(e) => e.key === "Enter" && start()}
                  placeholder="you@example.com"
                  aria-invalid={emailError}
                  className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                {emailError ? (
                  <p role="alert" className="text-xs font-bold text-destructive">Enter a valid email address.</p>
                ) : (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Given to the payment provider for your receipt. We keep only a one-way fingerprint of it (so you can restore your plan) and never the address itself, and we do not send it to analytics.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={start}
                className="w-full rounded-full bg-primary px-6 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                Unlock My Plan
              </button>
              <p className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <Lock className="h-3 w-3" /> One payment. No subscription. Your free score and sharing stay free.
              </p>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                By paying you agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Terms</a>{" "}
                and the{" "}
                <a href="/refunds" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Refund Policy</a>.
              </p>
              {PAYMENTS_MODE === "live" && (
                <div className="border-t border-border/30 pt-4">
                  {!restoring ? (
                    <button
                      type="button"
                      onClick={() => setRestoring(true)}
                      className="w-full text-center text-xs font-black uppercase tracking-widest text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
                    >
                      Already paid? Restore your plan
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <label htmlFor="restore-ref" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">
                        Payment reference, or the email you paid with
                      </label>
                      <input
                        id="restore-ref"
                        value={restoreRef}
                        onChange={(e) => {
                          setRestoreRef(e.target.value);
                          setRestoreError("");
                        }}
                        onKeyDown={(e) => e.key === "Enter" && restore()}
                        placeholder="you@example.com or cm-xxxxxxxx-xxxxxxxxxxxx"
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={!!restoreError}
                        className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      />
                      {restoreError ? (
                        <p role="alert" className="text-xs font-bold text-destructive">{restoreError}</p>
                      ) : (
                        <p className="text-[11px] leading-relaxed text-muted-foreground">
                          Only for this major, and only if the payment went through. We check it before unlocking.
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={restore}
                        disabled={restoreBusy || !restoreRef.trim()}
                        className="w-full rounded-full border border-border px-6 py-3 text-xs font-black uppercase tracking-widest text-foreground transition hover:bg-muted active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      >
                        {restoreBusy ? "Checking..." : "Restore my plan"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(step.name === "starting" || step.name === "redirecting") && (
            <Status icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />} title={step.name === "starting" ? "Starting secure checkout…" : "Taking you to the payment page…"} text="Please do not close this window." />
          )}

          {step.name === "mock" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-dashed border-amber-400/40 p-4">
                <p className="text-sm font-black uppercase">Test payment page</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  This stands in for the Paystack page. Pick what the payment should do. In live mode this screen is replaced by Paystack.
                </p>
              </div>
              <MockButton onClick={() => chooseMock(step.reference, "success")} tone="good">Pay {price.label} (simulate success)</MockButton>
              <MockButton onClick={() => chooseMock(step.reference, "slow")}>Pay, but confirmation is slow</MockButton>
              <MockButton onClick={() => chooseMock(step.reference, "failed")}>Simulate a failed payment</MockButton>
              <MockButton onClick={() => chooseMock(step.reference, "cancelled")}>Cancel the payment</MockButton>
            </div>
          )}

          {step.name === "processing" && (
            <Status icon={<Loader2 className="h-8 w-8 animate-spin text-primary" />} title="Confirming your payment…" text="This usually takes a few seconds. Please keep this window open." />
          )}

          {step.name === "pending" && (
            <div className="space-y-5">
              <Status icon={<Loader2 className="h-8 w-8 text-amber-300" />} title="Still waiting for confirmation" text="We have not heard back from the payment provider yet. Nothing is unlocked until they confirm. If you were charged, you will not be charged again." />
              <div className="flex flex-col gap-2">
                <PrimaryButton onClick={() => setStep({ name: "processing", reference: step.reference, proof: step.proof })}>Check again</PrimaryButton>
                <GhostButton onClick={cancelAndClose}>Return to my result</GhostButton>
              </div>
            </div>
          )}

          {step.name === "success" && (
            <div className="space-y-5">
              <Status icon={<SuccessIcon active size={44} className="text-emerald-500" />} title="Payment confirmed" text={`Your ${copy.name} is ready.`} />
              <PrimaryButton onClick={onViewPlan}>View my plan</PrimaryButton>
            </div>
          )}

          {step.name === "failed" && (
            <div className="space-y-5">
              <Status icon={<X className="h-8 w-8 text-destructive" />} title="Payment did not go through" text={FAILURE_TEXT[step.reason] ?? "The payment could not be completed. You have not been charged."} />
              <div className="flex flex-col gap-2">
                <PrimaryButton onClick={() => setStep({ name: "review" })}>Try again</PrimaryButton>
                <GhostButton onClick={cancelAndClose}>Return to my result</GhostButton>
              </div>
            </div>
          )}

          {step.name === "cancelled" && (
            <div className="space-y-5">
              <Status icon={<X className="h-8 w-8 text-muted-foreground" />} title="Payment cancelled" text="You have not been charged. Your free result is exactly where you left it." />
              <div className="flex flex-col gap-2">
                <PrimaryButton onClick={() => { closedRef.current = false; setStep({ name: "review" }); }}>Back to checkout</PrimaryButton>
                <GhostButton onClick={cancelAndClose}>Return to my result</GhostButton>
              </div>
            </div>
          )}

          {step.name === "error" && (
            <div className="space-y-5">
              <Status icon={<X className="h-8 w-8 text-destructive" />} title="Something went wrong" text={step.message} />
              <div className="flex flex-col gap-2">
                <PrimaryButton onClick={() => setStep({ name: "review" })}>Try again</PrimaryButton>
                <GhostButton onClick={cancelAndClose}>Return to my result</GhostButton>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function Status({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <div className="grid h-12 w-12 place-items-center">{icon}</div>
      <p className="text-lg font-black tracking-tight">{title}</p>
      <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full bg-primary px-6 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-full px-6 py-3 text-xs font-black uppercase tracking-widest text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {children}
    </button>
  );
}

function MockButton({ children, onClick, tone }: { children: React.ReactNode; onClick: () => void; tone?: "good" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl border px-4 py-3 text-left text-sm font-bold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        tone === "good" ? "border-emerald-500/50 text-emerald-400" : "border-border text-foreground"
      )}
    >
      {children}
    </button>
  );
}

