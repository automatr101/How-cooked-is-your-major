// A dollar amount shown FIRST, as the headline price, to visitors outside Ghana; the cedi charge is stated right under it.
// It is a guide only: the charge is always the cedi price, and the visitor's bank sets the exact rate. The amount is the
// old dollar price (PRICE_MINOR in premium.ts), so it does not follow the exchange rate: change it, or the cedi price
// (PAYSTACK_AMOUNT_MINOR), when the two drift apart. Plain TypeScript with no imports, so it can be tested on its own.

// The country each charged currency belongs to. A visitor from there pays in their own money and needs no hint.
const HOME_COUNTRY: Record<string, string> = { GHS: "GH" };

/**
 * "US$4.99" for a visitor who is charged in `chargedCurrency` but is, or may be, outside its home country; otherwise
 * null. `country` is the two-letter code Vercel puts in the x-vercel-ip-country header. Anything else counts as unknown,
 * and an unknown visitor gets the hint: a Ghanaian seeing it is harmless, a foreigner without it is not.
 */
export function dollarHint(chargedCurrency: string, country: string | null, usd: { currency: string; value: number }): string | null {
  const home = HOME_COUNTRY[chargedCurrency];
  if (!home || usd.currency !== "USD") return null; // charged in dollars already, or a currency with no home country listed
  if (country && /^[A-Za-z]{2}$/.test(country) && country.toUpperCase() === home) return null;
  return `US$${usd.value.toFixed(2)}`;
}
