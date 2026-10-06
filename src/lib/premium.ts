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

export const PRODUCT_NAME = "Major Intelligence Career Plan";
export const PRODUCT_ID = "major-intelligence-career-plan";
export const PRICE_MINOR = 499; // $4.99 in cents; the server always uses this, never a number from the browser
export const PRICE_CURRENCY = "USD";
export const PRICE_VALUE = PRICE_MINOR / 100;
export const PRICE_LABEL = "$4.99";

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
  /** Locked until payment. */
  locked: string[];
}

const LOCKED = [
  "30/60/90 day roadmap",
  "Projects to build",
  "Career paths",
  "Internship strategy",
  "AI tools to learn",
  "Skills that increase employability",
];

export const PLAN_COPY: Record<PlanType, PlanCopy> = {
  uncooking: {
    name: "Uncooking Plan",
    eyebrow: "Your uncooking plan",
    headline: "You're cooked. Here's how we fix it.",
    cta: "Get My Uncooking Plan",
    blurb: "The free score tells you how exposed you are. The plan tells you what to do about it, step by step.",
    preview: ["AI exposure analysis", "Career opportunities", "Skills to build"],
    locked: LOCKED,
  },
  future_proof: {
    name: "Future-Proof Plan",
    eyebrow: "Your future-proof plan",
    headline: "You're not cooked. But don't get comfortable.",
    cta: "Get My Future-Proof Plan",
    blurb: "You have room to move. The plan shows where AI will reach you first and how to stay ahead of it.",
    preview: ["AI exposure analysis", "Career opportunities", "Skills to build"],
    locked: LOCKED,
  },
  advantage: {
    name: "Career Advantage Plan",
    eyebrow: "Your career advantage plan",
    headline: "You're safe. Now build your advantage.",
    cta: "Build My Career Advantage",
    blurb: "A strong starting position is not a plan. This turns yours into a lead that lasts.",
    preview: ["AI exposure analysis", "Career opportunities", "Skills to build"],
    locked: LOCKED,
  },
};
