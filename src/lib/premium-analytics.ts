// GA4 events for the paid plan funnel. Uses the shared track() from analytics.ts.
//   major_scan -> major_result_view -> premium_cta_viewed -> premium_cta_clicked -> checkout_started
//   -> purchase -> report_unlocked      (plus payment_failed and payment_cancelled)
//
// Never send an email, a name or anything else about a person. Every event also carries payment_mode so
// test runs can be told apart from real ones. In test mode the revenue event is NOT called `purchase`
// (it would count as real revenue in GA4); it is sent as `test_purchase` instead.

import { track, slugify } from "@/lib/analytics";
import { PAYMENTS_MODE, PRICE_CURRENCY, PRICE_VALUE, PRODUCT_ID, PRODUCT_NAME, type PlanType } from "@/lib/premium";

interface Subject {
  name: string;
  score: number;
  level: string;
}

const base = (m: Subject, planType: PlanType) => ({
  major_name: m.name,
  cooked_score: m.score,
  plan_type: planType,
  payment_mode: PAYMENTS_MODE,
});

/** Once per key for this browser session, so a re-render or a re-verify never double-counts. */
function once(key: string): boolean {
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {}
  return true;
}

export function trackOfferViewed(m: Subject, planType: PlanType) {
  if (!once(`cm_ga_view:${slugify(m.name)}`)) return;
  track("premium_cta_viewed", { ...base(m, planType), major_slug: slugify(m.name), cooked_level: slugify(m.level) });
}

export function trackOfferClicked(m: Subject, planType: PlanType) {
  track("premium_cta_clicked", { ...base(m, planType), price: PRICE_VALUE });
}

export function trackCheckoutStarted(m: Subject, planType: PlanType) {
  track("checkout_started", { ...base(m, planType), price: PRICE_VALUE, currency: PRICE_CURRENCY });
}

/** checkout_completed, plus the purchase event. Sent once per transaction. */
export function trackPaid(m: Subject, planType: PlanType, transactionId: string) {
  if (!once(`cm_ga_paid:${transactionId}`)) return;
  track("checkout_completed", { ...base(m, planType), price: PRICE_VALUE, currency: PRICE_CURRENCY });
  track(PAYMENTS_MODE === "live" ? "purchase" : "test_purchase", {
    transaction_id: transactionId,
    value: PRICE_VALUE,
    currency: PRICE_CURRENCY,
    item_name: PRODUCT_NAME,
    major_name: m.name,
    cooked_score: m.score,
    plan_type: planType,
    payment_mode: PAYMENTS_MODE,
    items: [{ item_id: PRODUCT_ID, item_name: PRODUCT_NAME, item_variant: planType, price: PRICE_VALUE, quantity: 1 }],
  });
}

export function trackPaymentFailed(m: Subject, planType: PlanType, reason: string) {
  track("payment_failed", { major_name: m.name, plan_type: planType, failure_reason: reason, payment_mode: PAYMENTS_MODE });
}

export function trackPaymentCancelled(m: Subject, planType: PlanType) {
  track("payment_cancelled", { major_name: m.name, plan_type: planType, payment_mode: PAYMENTS_MODE });
}

export function trackReportUnlocked(m: Subject, planType: PlanType) {
  if (!once(`cm_ga_unlocked:${slugify(m.name)}`)) return;
  track("report_unlocked", base(m, planType));
}

// PDF download. major_name, major_slug, cooked_score and plan_type only (plus payment_mode).
const pdfParams = (m: { name: string; slug: string; score: number }, planType: PlanType) => ({
  major_name: m.name,
  major_slug: m.slug,
  cooked_score: m.score,
  plan_type: planType,
  payment_mode: PAYMENTS_MODE,
});

/** One per tap. The button is disabled while a PDF is being prepared, so taps never double up. */
export function trackPdfClicked(m: { name: string; slug: string; score: number }, planType: PlanType) {
  track("pdf_download_clicked", pdfParams(m, planType));
}

/** One per file actually received by the browser. */
export function trackPdfDownloaded(m: { name: string; slug: string; score: number }, planType: PlanType) {
  track("pdf_downloaded", pdfParams(m, planType));
}

export function trackPdfFailed(m: { name: string; slug: string; score: number }, planType: PlanType, reason: string) {
  track("pdf_download_failed", { ...pdfParams(m, planType), failure_reason: reason });
}
