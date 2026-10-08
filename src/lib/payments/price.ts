import { DEFAULT_PRICE, PAYMENTS_MODE, priceOf, type Price } from "@/lib/premium";
import { charge } from "./paystack";

// SERVER ONLY. What a buyer is charged right now. In live mode that is exactly what the Paystack code asks for
// (PAYSTACK_CURRENCY and PAYSTACK_AMOUNT_MINOR, or the default), so the price the page shows can never differ from
// the price charged: both come from the same place. In the fake checkout it is the default price. A broken
// setting falls back to the default for display only; starting a payment would refuse in that case anyway.

export function currentPrice(): Price {
  if (PAYMENTS_MODE === "live") {
    try {
      const paid = charge();
      return priceOf(paid.currency, paid.amount);
    } catch {
      // misconfigured: the checkout itself reports it (owner-only message)
    }
  }
  return DEFAULT_PRICE;
}
