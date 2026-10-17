// SERVER ONLY. The comeback offer: a visitor who comes back to the paywall on a later visit gets 30% off for 24 hours, once.
//
// It is real, not a countdown for show: the server signs the end time into a cookie when the offer is first shown, the price
// the page shows and the price the payment is created at both come from that cookie, and from the end time on the normal price
// applies again by itself. A second cookie remembers that this browser already had the offer, so it is not handed out again.
// (Someone who clears their cookies can get it a second time. That is the accepted cost of not tracking people.)
//
// A payment started while the offer ran is accepted at the offer amount even if it is verified after the end, the same way the
// launch price works: the amount is always chosen by our server when the payment starts, never by the browser.

import type { NextRequest } from "next/server";
import { sign, verifySignature } from "./signing";

export const COMEBACK_PERCENT = 30;
export const COMEBACK_HOURS = 24;
export const COMEBACK_COOKIE = "cm_comeback";
export const COMEBACK_SEEN_COOKIE = "cm_comeback_seen";

const HOUR = 3600 * 1000;

/** 30% off, in the smallest unit (GHS 46.90 -> 32.83, $4.99 -> $3.49). */
export function comebackMinor(regularMinor: number): number {
  return Math.round((regularMinor * (100 - COMEBACK_PERCENT)) / 100);
}

/** A new signed offer that ends 24 hours from now. */
export function newComeback(now: number = Date.now()): { value: string; endsAt: Date } {
  const endsAt = now + COMEBACK_HOURS * HOUR;
  return { value: `${endsAt}.${sign(`comeback:${endsAt}`)}`, endsAt: new Date(endsAt) };
}

/** The offer this request carries, only while it is running. */
export function activeComeback(req: NextRequest, now: number = Date.now()): { endsAt: Date } | null {
  const raw = req.cookies.get(COMEBACK_COOKIE)?.value ?? "";
  const [ends, signature] = raw.split(".");
  const endsAt = Number(ends);
  if (!signature || !Number.isInteger(endsAt)) return null;
  if (!verifySignature(`comeback:${endsAt}`, signature)) return null;
  // Running, and never longer than the 24 hours a genuine one lasts (a minute of slack for clock differences)
  if (endsAt <= now || endsAt - now > COMEBACK_HOURS * HOUR + 60_000) return null;
  return { endsAt: new Date(endsAt) };
}
