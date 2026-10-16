import { DEFAULT_PRICE, PAYMENTS_MODE, priceOf, type Price } from "@/lib/premium";
import { activeCharge, charge } from "./paystack";
import { activeLaunch, activeLaunchUsd } from "./launch";
import { stripeCharge } from "./stripe";

// SERVER ONLY. What a buyer is charged right now. In live mode that is exactly what the Paystack code asks for
// (activeCharge: the launch price while a launch is running, otherwise PAYSTACK_CURRENCY and PAYSTACK_AMOUNT_MINOR), so
// the price the page shows can never differ from the price charged: both come from the same place. In the fake checkout it
// is the default price (or the launch price, so the discount can be tried without money). A broken setting falls back to
// the default for display only; starting a payment would refuse in that case anyway.

/** The normal price and the currency it is charged in. */
function regularPrice(): Price {
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

export function currentPrice(): Price {
  const regular = regularPrice();
  if (PAYMENTS_MODE === "live") {
    try {
      const paid = activeCharge();
      return priceOf(paid.currency, paid.amount);
    } catch {
      return regular;
    }
  }
  const launch = activeLaunch(regular.minor);
  return launch ? priceOf(regular.currency, launch.minor) : regular;
}

/** The running launch, for the page to show: the normal price (struck through) and when it ends. Null when there is none. */
export function launchInfo(): { regular: Price; endsAt: string; approxUsd: number | null } | null {
  const regular = regularPrice();
  const launch = activeLaunch(regular.minor);
  return launch ? { regular, endsAt: launch.endsAt.toISOString(), approxUsd: launch.approxUsd } : null;
}

/** What a Stripe buyer is charged right now, in dollars. */
export function stripePrice(): Price {
  const c = stripeCharge();
  return priceOf(c.currency, c.amount);
}

/** The running launch for a Stripe buyer: the normal dollar price and when it ends. Null when there is no dollar launch. */
export function stripeLaunchInfo(): { regular: Price; endsAt: string } | null {
  const regular = priceOf(DEFAULT_PRICE.currency, DEFAULT_PRICE.minor);
  const launch = activeLaunchUsd(regular.minor);
  return launch ? { regular, endsAt: launch.endsAt.toISOString() } : null;
}
