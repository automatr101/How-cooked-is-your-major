import { NextRequest } from "next/server";
import { entitledSlugs } from "@/lib/payments/entitlement";
import { gateActive, gateAllows } from "@/lib/payments/gate";
import { currentPrice, launchInfo, regularPriceForPage, stripeLaunchInfo, stripePrice } from "@/lib/payments/price";
import { activeComeback, comebackMinor } from "@/lib/payments/comeback";
import { stripeAudience, stripeEnabled } from "@/lib/payments/stripe";
import { json } from "@/lib/payments/http";
import { DEFAULT_PRICE, PAYMENTS_MODE } from "@/lib/premium";
import { dollarHint } from "@/lib/price-hint";

// Tells the page whether to show the paid offer to THIS visitor: payments must be on, and if the private gate is
// closed the browser must carry the gate cookie. One source of truth, so the page and the payment routes can
// never disagree. `gated` lets analytics label test runs so they never count as real revenue. `unlocked` lists the
// majors this browser's cookie says it has paid for (it already knows: this just lets a returning buyer's page load
// their plan straight away, even after the browser was closed). The plan itself is still only served by /api/plan.
// `price` is what a buyer is charged right now, taken from the same settings the charge uses, so the page never
// shows one price and charges another. `approx` (only for visitors outside the country the price is charged in, by
// the country Vercel reports for the request) is a dollar amount the page shows them as the headline price, with the
// cedi charge stated under it; it never changes the price charged, and the answer is never cached, so each visitor
// gets their own.

export async function GET(req: NextRequest) {
  if (PAYMENTS_MODE === "off") return json({ enabled: false, gated: false, unlocked: [] });
  const enabled = gateAllows(req);
  const country = req.headers.get("x-vercel-ip-country");
  // A visitor who will pay with Stripe is charged real US dollars: show exactly that, with no cedi note and no dollar "guide"
  const useStripe = enabled && stripeEnabled() && stripeAudience(country);
  // A running comeback offer (signed cookie): 30% off for this visitor until its end. It shows only when it is the lower price.
  const comeback = enabled ? activeComeback(req) : null;
  const withoutComeback = enabled ? (useStripe ? stripePrice() : currentPrice()) : null;
  const price = enabled ? (useStripe ? stripePrice(!!comeback) : currentPrice(!!comeback)) : null;
  const comebackWins = !!comeback && !!price && !!withoutComeback && price.minor < withoutComeback.minor;
  const launch = !enabled
    ? null
    : comebackWins
      ? { regular: regularPriceForPage(useStripe), endsAt: comeback!.endsAt.toISOString(), approxUsd: comebackMinor(DEFAULT_PRICE.minor) / 100, kind: "comeback" as const }
      : useStripe
        ? stripeLaunchInfo()
        : launchInfo();
  // During a launch the dollar figure is the owner's own LAUNCH_APPROX_USD; without it, visitors outside Ghana see the cedi
  // price alone (nothing is converted here, and the old $4.99 would be wrong next to a discounted cedi price).
  const approxUsd: number | null = launch && "approxUsd" in launch ? (launch as { approxUsd: number | null }).approxUsd : null;
  const usd: { currency: string; value: number } | null = launch ? (approxUsd ? { currency: "USD", value: approxUsd } : null) : DEFAULT_PRICE;
  const approx = price && usd && !useStripe ? dollarHint(price.currency, country, usd) : null;
  const regularApprox = launch && approx ? dollarHint(price!.currency, country, DEFAULT_PRICE) : null;
  return json({
    enabled,
    gated: gateActive(),
    unlocked: enabled ? entitledSlugs(req) : [],
    ...(enabled && PAYMENTS_MODE === "live" ? { provider: useStripe ? "stripe" : "paystack" } : {}),
    ...(price ? { price } : {}),
    ...(approx ? { approx } : {}),
    ...(launch ? { launch: { regular: launch.regular, endsAt: launch.endsAt, ...(regularApprox ? { regularApprox } : {}), ...("kind" in launch ? { kind: launch.kind } : {}) } } : {}),
  });
}
