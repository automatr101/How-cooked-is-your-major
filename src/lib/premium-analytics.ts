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

// While the private gate is closed (testing before launch), every event says so and the revenue event is sent as
// test_purchase, so test payments can never count as real revenue in GA4. Set by PremiumOffer from /api/payments/status.
let gated = false;
export function setGated(value: boolean) {
  gated = value;
}
const mode = () => (gated ? "gated" : PAYMENTS_MODE);

const base = (m: Subject, planType: PlanType) => ({
  major_name: m.name,
  cooked_score: m.score,
  plan_type: planType,
  payment_mode: mode(),
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
  track(PAYMENTS_MODE === "live" && !gated ? "purchase" : "test_purchase", {
    transaction_id: transactionId,
    value: PRICE_VALUE,
    currency: PRICE_CURRENCY,
    item_name: PRODUCT_NAME,
    major_name: m.name,
    cooked_score: m.score,
    plan_type: planType,
    payment_mode: mode(),
    items: [{ item_id: PRODUCT_ID, item_name: PRODUCT_NAME, item_variant: planType, price: PRICE_VALUE, quantity: 1 }],
  });
}

export function trackPaymentFailed(m: Subject, planType: PlanType, reason: string) {
  track("payment_failed", { major_name: m.name, plan_type: planType, failure_reason: reason, payment_mode: mode() });
}

export function trackPaymentCancelled(m: Subject, planType: PlanType) {
  track("payment_cancelled", { major_name: m.name, plan_type: planType, payment_mode: mode() });
}

export function trackReportUnlocked(m: Subject, planType: PlanType) {
  if (!once(`cm_ga_unlocked:${slugify(m.name)}`)) return;
  track("report_unlocked", base(m, planType));
}
