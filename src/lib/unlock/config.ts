// SERVER ONLY. The paid-unlock experiment: for a limited time, a visitor pays to REVEAL their result (score, roast, card).
// It is OFF unless both times below are set, and it turns itself off when the end time passes. Nothing is deleted: the free
// result is the normal code path, the experiment only decides whether to show a lock in front of it.
//
//   UNLOCK_EXPERIMENT_START   when the experiment begins   (ISO time, e.g. 2026-10-28T12:00:00Z)
//   UNLOCK_EXPERIMENT_END     when it ends (free results come back by themselves); at most 7 days after the start,
//                             so a typo can never leave the paywall on for good
//   UNLOCK_GHS_MINOR          the price in pesewas for visitors paid in cedis through Paystack (default 1870 = GHS 18.70,
//                             about $1.99 at the rate used for the Survival Plan). Dollars (Stripe) are always exactly $1.99.
//
// To stop it early: delete UNLOCK_EXPERIMENT_START (or set the end to a past time) and redeploy.

import { PRICE_CURRENCY } from "@/lib/premium";
import { SafeError } from "@/lib/payments/types";

export const UNLOCK_PRODUCT_ID = "major-intelligence-result-unlock";
export const UNLOCK_PRODUCT_NAME = "Result unlock";
export const UNLOCK_USD_MINOR = 199; // $1.99, chosen by the server, never by the browser
export const UNLOCK_KEY_PREFIX = "unlock:"; // the purchases table's major_slug for an unlock: "unlock:law"

const MAX_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export interface ExperimentWindow {
  active: boolean;
  startsAt?: string;
  endsAt?: string;
}

/** Is the experiment running at `now`? Both times must be valid, the end after the start, and the span at most 7 days. */
export function experimentWindow(now: number = Date.now()): ExperimentWindow {
  const start = Date.parse(process.env.UNLOCK_EXPERIMENT_START ?? "");
  const end = Date.parse(process.env.UNLOCK_EXPERIMENT_END ?? "");
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > MAX_WINDOW_MS) return { active: false };
  return { active: now >= start && now < end, startsAt: new Date(start).toISOString(), endsAt: new Date(end).toISOString() };
}

/** The price in `currency`'s smallest unit: $1.99, or the owner's cedi price. Anything else cannot be charged. */
export function unlockMinorFor(currency: string): number {
  if (currency === PRICE_CURRENCY) return UNLOCK_USD_MINOR;
  const configured = process.env.UNLOCK_GHS_MINOR?.trim();
  const amount = configured ? Number(configured) : currency === "GHS" ? 1870 : NaN;
  if (!Number.isInteger(amount) || amount <= 0) throw new SafeError(`UNLOCK_GHS_MINOR must be a whole number of pesewas when payments are in ${currency}`);
  return amount;
}

export const unlockKey = (slug: string) => `${UNLOCK_KEY_PREFIX}${slug}`;
