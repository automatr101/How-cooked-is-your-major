// SERVER ONLY. The launch discount: a REAL lower price for a limited time, controlled entirely by the owner's settings.
//
//   LAUNCH_PRICE_MINOR   the discounted price in the smallest unit, in the same currency as the normal price
//                        (GHS pesewas: GHS 36.90 is 3690). Must be a whole number, above 0 and below the normal price.
//   LAUNCH_ENDS_AT       when it ends, as a full date and time with a time zone, e.g. 2026-10-31T23:59:59Z
//   LAUNCH_APPROX_USD    optional: the dollar figure shown first to visitors outside Ghana during the launch, e.g. 3.99.
//                        If it is not set, those visitors see the cedi price only (the code never converts currencies).
//
// Both of the first two must be set and valid, or there is no discount at all (a typo can never lower the price by
// accident). The server chooses the amount when a payment starts: it is the discount price until LAUNCH_ENDS_AT and the
// normal price from that moment, with no redeploy. The browser can neither ask for the discount nor keep it past the end.
// A payment started before the end is still accepted and recorded at the price it was started at. Remove the settings to
// end it early.

export interface LaunchOffer {
  /** The discounted price, smallest unit. */
  minor: number;
  endsAt: Date;
  /** Dollar figure for visitors outside Ghana, or null (then they see the cedi price only). */
  approxUsd: number | null;
}

function readMinor(regularMinor: number): number | null {
  const n = Number(process.env.LAUNCH_PRICE_MINOR?.trim());
  return Number.isInteger(n) && n > 0 && n < regularMinor ? n : null;
}

function readEnd(): Date | null {
  const raw = process.env.LAUNCH_ENDS_AT?.trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** The configured discount amount, whether or not it is still running. Used to accept a payment started before the end. */
export function launchMinor(regularMinor: number): number | null {
  return readEnd() ? readMinor(regularMinor) : null;
}

/** The discount, only while it is running right now; otherwise null. */
export function activeLaunch(regularMinor: number, now: Date = new Date()): LaunchOffer | null {
  const minor = readMinor(regularMinor);
  const endsAt = readEnd();
  if (minor === null || endsAt === null || endsAt.getTime() <= now.getTime()) return null;
  const usd = Number(process.env.LAUNCH_APPROX_USD?.trim());
  return { minor, endsAt, approxUsd: Number.isFinite(usd) && usd > 0 ? usd : null };
}

// ---- the same launch, for Stripe (USD). The price during the launch is LAUNCH_APPROX_USD (the owner's own figure, e.g. 3.99),
// shown and charged in dollars to visitors who pay with Stripe. The end time is the same LAUNCH_ENDS_AT. Without
// LAUNCH_APPROX_USD there is no dollar discount: Stripe buyers then simply pay the normal dollar price.

function readUsdMinor(regularMinor: number): number | null {
  const usd = Number(process.env.LAUNCH_APPROX_USD?.trim());
  if (!Number.isFinite(usd) || usd <= 0) return null;
  const cents = Math.round(usd * 100);
  return cents > 0 && cents < regularMinor ? cents : null;
}

/** The configured dollar launch amount in cents, whether or not it is still running (to accept a payment started before the end). */
export function launchUsdMinor(regularMinor: number): number | null {
  return readEnd() ? readUsdMinor(regularMinor) : null;
}

/** The dollar launch, only while it is running right now. */
export function activeLaunchUsd(regularMinor: number, now: Date = new Date()): { minor: number; endsAt: Date } | null {
  const minor = readUsdMinor(regularMinor);
  const endsAt = readEnd();
  if (minor === null || endsAt === null || endsAt.getTime() <= now.getTime()) return null;
  return { minor, endsAt };
}
