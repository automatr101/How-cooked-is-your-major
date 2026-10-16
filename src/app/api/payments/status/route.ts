import { NextRequest } from "next/server";
import { entitledSlugs } from "@/lib/payments/entitlement";
import { gateActive, gateAllows } from "@/lib/payments/gate";
import { currentPrice, launchInfo } from "@/lib/payments/price";
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
  const price = enabled ? currentPrice() : null;
  const launch = enabled ? launchInfo() : null;
  const country = req.headers.get("x-vercel-ip-country");
  // During a launch the dollar figure is the owner's own LAUNCH_APPROX_USD; without it, visitors outside Ghana see the cedi
  // price alone (nothing is converted here, and the old $4.99 would be wrong next to a discounted cedi price).
  const usd = launch ? (launch.approxUsd ? { currency: "USD", value: launch.approxUsd } : null) : DEFAULT_PRICE;
  const approx = price && usd ? dollarHint(price.currency, country, usd) : null;
  const regularApprox = launch && approx ? dollarHint(price!.currency, country, DEFAULT_PRICE) : null;
  return json({
    enabled,
    gated: gateActive(),
    unlocked: enabled ? entitledSlugs(req) : [],
    ...(price ? { price } : {}),
    ...(approx ? { approx } : {}),
    ...(launch ? { launch: { regular: launch.regular, endsAt: launch.endsAt, ...(regularApprox ? { regularApprox } : {}) } } : {}),
  });
}
