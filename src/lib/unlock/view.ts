import { PAYMENTS_MODE, PRICE_CURRENCY, priceOf, type Price } from "@/lib/premium";
import { charge } from "@/lib/payments/paystack";
import { stripeAudience, stripeEnabled } from "@/lib/payments/stripe";
import { UNLOCK_USD_MINOR, unlockMinorFor } from "./config";
import type { ExperimentView } from "./shared";

// SERVER ONLY. What THIS visitor is charged to reveal a result, and the labels the page shows for it. It follows the same
// provider choice as every other payment (Stripe in dollars outside Ghana, Paystack in cedis in Ghana, the fake checkout in
// test mode), so the price on the page is always the price charged.

export interface UnlockPrice {
  price: Price;
  provider: "mock" | "paystack" | "stripe";
  /** "$1.99": shown next to a cedi price so the dollar price is never hidden. */
  approx?: string;
}

export function unlockPriceFor(country: string | null): UnlockPrice {
  const usd = priceOf(PRICE_CURRENCY, UNLOCK_USD_MINOR);
  if (PAYMENTS_MODE !== "live") return { price: usd, provider: "mock" };
  if (stripeEnabled() && stripeAudience(country)) return { price: usd, provider: "stripe" };
  try {
    const currency = charge().currency;
    const price = priceOf(currency, unlockMinorFor(currency));
    return { price, provider: "paystack", ...(currency !== PRICE_CURRENCY ? { approx: usd.label } : {}) };
  } catch {
    return { price: usd, provider: "paystack" }; // a broken setting is reported when someone tries to pay, not here
  }
}

export function experimentView(endsAt: string, country: string | null): ExperimentView {
  const { price, approx } = unlockPriceFor(country);
  return { endsAt, priceLabel: price.label, ...(approx ? { approxLabel: approx } : {}) };
}
