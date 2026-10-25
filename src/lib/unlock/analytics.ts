// Browser-side GA4 events for the paid-unlock experiment, so its funnel can be read in one place:
//
//   assessment_started -> assessment_completed -> paywall_viewed -> unlock_checkout_clicked -> payment_succeeded -> result_unlocked
//   (plus payment_failed, and result_shared for every share while the experiment runs)
//
// Every event carries the experiment id and variant, an anonymous per-assessment id (random, made in this tab, never tied to
// a person) and a timestamp. Nothing else about the visitor: no email, no name. Revenue is the normal GA4 `purchase` event
// (the unlock's own item id), or `test_purchase` in test mode and during the private gate, so tests never count as revenue.

import { track, slugify } from "@/lib/analytics";
import { PAYMENTS_MODE } from "@/lib/premium";
import { EXPERIMENT_ID, EXPERIMENT_VARIANT } from "./shared";

type EventName =
  | "assessment_started"
  | "assessment_completed"
  | "paywall_viewed"
  | "unlock_checkout_clicked"
  | "payment_succeeded"
  | "payment_failed"
  | "result_unlocked"
  | "result_shared";

interface Subject {
  name: string;
  score: number;
}

let running = false;
let gated = false;
let assessment: { id: string; major: string } | null = null;

/** Called by the page when the server says the experiment is running for this visitor. */
export function setUnlockExperimentRunning(value: boolean) {
  running = value;
}
/** The private gate is closed to the public: tests carry that, and their revenue is sent as test_purchase. */
export function setUnlockGated(value: boolean) {
  gated = value;
}

function randomId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }
}

/** A new assessment (the visitor scanned a major). */
export function startAssessment(major: string): string {
  assessment = { id: randomId(), major };
  return assessment.id;
}

/** The assessment for this major, made now if the page opened straight on a result (a shared link, coming back from paying). */
function assessmentFor(major: string): string {
  if (!assessment || assessment.major !== major) startAssessment(major);
  return assessment!.id;
}

/** Once per assessment and event, so a re-render or a retry never double-counts. */
const seen = new Set<string>();
function once(event: EventName, id: string): boolean {
  const key = `${event}:${id}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
}

export function trackUnlock(event: EventName, major: Subject, extra: Record<string, string | number | boolean> = {}, oncePerAssessment = false) {
  if (!running) return;
  const id = assessmentFor(major.name);
  if (oncePerAssessment && !once(event, id)) return;
  track(event, {
    experiment: EXPERIMENT_ID,
    variant: EXPERIMENT_VARIANT,
    assessment_id: id,
    client_ts: new Date().toISOString(),
    major_slug: slugify(major.name),
    cooked_score: major.score,
    payment_mode: gated ? "gated" : PAYMENTS_MODE,
    ...extra,
  });
}

/** The revenue event: once per transaction. Value and currency are what was really charged. */
export function trackUnlockPurchase(major: Subject, transactionId: string, value: number, currency: string) {
  if (!running) return;
  if (!once("payment_succeeded", `purchase:${transactionId}`)) return;
  track(PAYMENTS_MODE === "live" && !gated ? "purchase" : "test_purchase", {
    transaction_id: transactionId,
    value,
    currency,
    item_name: "Result unlock",
    major_name: major.name,
    cooked_score: major.score,
    experiment: EXPERIMENT_ID,
    variant: EXPERIMENT_VARIANT,
    payment_mode: gated ? "gated" : PAYMENTS_MODE,
    items: [{ item_id: "major-intelligence-result-unlock", item_name: "Result unlock", price: value, quantity: 1 }],
  });
}
