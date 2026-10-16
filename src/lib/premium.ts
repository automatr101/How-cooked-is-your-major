// Shared (browser and server) settings for the paid career plan: which plan a score gets, its wording,
// and the price. No secrets live here. The payment mode is a public setting on purpose, so the page can
// decide whether to show the offer at all.
//
//   NEXT_PUBLIC_PAYMENTS_MODE = "off"  (default) the offer is not shown and the payment routes answer 404
//                               "test" the offer is shown with a clearly marked fake checkout; no money moves
//                               "live" the offer uses Paystack (needs PAYSTACK_SECRET_KEY etc., see .env.example)

export type PaymentsMode = "off" | "test" | "live";

const raw = process.env.NEXT_PUBLIC_PAYMENTS_MODE;
export const PAYMENTS_MODE: PaymentsMode = raw === "test" || raw === "live" ? raw : "off";

export const PRODUCT_NAME = "The Survival Plan";
export const PRODUCT_ID = "major-intelligence-career-plan";
// The DEFAULT price: used by the fake checkout and whenever the Paystack settings are not set. What a buyer is really
// charged in live mode comes from PAYSTACK_CURRENCY and PAYSTACK_AMOUNT_MINOR on the server (a Ghana Paystack
// account cannot charge in USD, so production uses GHS), and the page shows exactly that (see /api/payments/status).
export const PRICE_MINOR = 499; // $4.99 in cents; the server always uses this, never a number from the browser
export const PRICE_CURRENCY = "USD";
export const PRICE_VALUE = PRICE_MINOR / 100;
export const PRICE_LABEL = "$4.99";

export interface Price {
  currency: string; // "USD", "GHS"...
  minor: number; // smallest unit: cents, pesewas
  value: number; // major units, e.g. 46.9
  label: string; // what the page shows: "$4.99", "GHS 46.90"
}

/** A price from a currency code and an amount in the smallest unit. */
export function priceOf(currency: string, minor: number): Price {
  const value = minor / 100;
  return { currency, minor, value, label: currency === "USD" ? `$${value.toFixed(2)}` : `${currency} ${value.toFixed(2)}` };
}

export const DEFAULT_PRICE: Price = { currency: PRICE_CURRENCY, minor: PRICE_MINOR, value: PRICE_VALUE, label: PRICE_LABEL };

export type PlanType = "uncooking" | "future_proof" | "advantage";

/** 70-100 uncooking, 40-69 future-proof, 0-39 advantage. */
export function planTypeFor(score: number): PlanType {
  return score >= 70 ? "uncooking" : score >= 40 ? "future_proof" : "advantage";
}

export interface PlanCopy {
  /** "Uncooking Plan" */
  name: string;
  /** Eyebrow above the headline on the offer card. */
  eyebrow: string;
  headline: string;
  cta: string;
  /** One line under the headline. */
  blurb: string;
  /** Shown to everyone: the first things the plan covers. */
  preview: string[];
}

// Longest major name that still reads well inside a list line; a longer one becomes "your major".
const MAX_NAME_IN_LIST = 34;

/**
 * What the paid report holds, worded for the major on screen (the offer shows them blurred until the plan is
 * unlocked). Every line names a real section of the report (roadmap, projects, career paths, internship, AI tools,
 * employability), so nothing promised is missing. Plain strings only: the list is rendered as text.
 */
export function lockedItems(majorName: string): string[] {
  const name = majorName.trim();
  const m = name && name.length <= MAX_NAME_IN_LIST ? name : "your major";
  return [
    `30/60/90-day roadmap for ${m}`,
    `Projects to build for ${m}`,
    `Career paths for ${m}`,
    `Internship strategy for ${m}`,
    `AI tools to learn for ${m}`,
    `Skills that raise ${m} employability`,
  ];
}

/**
 * The words on the offer card, written for THIS visitor: their real score and their major's name. Only things that are
 * true are said here: the score is theirs, the plan really covers what is named, nothing claims a result, a job or a salary,
 * and nothing is scarce, counted or time-limited that is not (there is no countdown and no "only N left", because there is
 * none). The static PLAN_COPY below is what the PDF and the alerts use.
 */
export function offerCopy(planType: PlanType, majorName: string, score: number): { headline: string; blurb: string } {
  const name = majorName.trim();
  const m = name && name.length <= MAX_NAME_IN_LIST ? name : "your major";
  // The words follow the score in three bands (60+, 30-59, under 30). Which plan CONTENT a score gets (planTypeFor) is unchanged.
  if (score >= 60) {
    return {
      headline: `Your major is ${score}% cooked. Here's your 90-day escape plan.`,
      blurb: `The free score shows the risk. This plan shows the way out for ${m}: what to learn, what to build and who to reach, one step at a time.`,
    };
  }
  if (score >= 30) {
    return {
      headline: `${score}%: not doomed, not safe. Know what hits first.`,
      blurb: `See where AI reaches ${m} first, and the 30/60/90-day moves that keep you ahead of it. Doing nothing is the only risky option.`,
    };
  }
  return {
    headline: `${score}%: you're safe. Future-proof your edge.`,
    blurb: `A safe score is a starting point, not a plan. This turns it into an edge for ${m} that lasts.`,
  };
}

export const PLAN_COPY: Record<PlanType, PlanCopy> = {
  uncooking: {
    name: "The Survival Plan",
    eyebrow: "Your survival plan",
    headline: "You're cooked. Here's how we fix it.",
    cta: "Get My Survival Plan",
    blurb: "The free score tells you how exposed you are. The plan tells you what to do about it, step by step.",
    preview: ["AI exposure analysis", "Career opportunities", "Skills to build"],
  },
  future_proof: {
    name: "The Survival Plan",
    eyebrow: "Your survival plan",
    headline: "You're not cooked. But don't get comfortable.",
    cta: "Get My Survival Plan",
    blurb: "You have room to move. The plan shows where AI will reach you first and how to stay ahead of it.",
    preview: ["AI exposure analysis", "Career opportunities", "Skills to build"],
  },
  advantage: {
    name: "The Survival Plan",
    eyebrow: "Your survival plan",
    headline: "You're safe. Now build your advantage.",
    cta: "Future-Proof My Edge",
    blurb: "A strong starting position is not a plan. This turns yours into a lead that lasts.",
    preview: ["AI exposure analysis", "Career opportunities", "Skills to build"],
  },
};
