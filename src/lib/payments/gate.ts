import type { NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { PAYMENTS_MODE } from "@/lib/premium";
import { sign, verifySignature } from "./signing";

// SERVER ONLY. The private gate: a way to switch payments on for ONE browser (yours) while every visitor sees
// nothing, so the whole flow can be tested on the real site, with test keys and then with one real payment,
// before it is opened to everyone.
//
//   PAYMENTS_PREVIEW_KEY   a secret of 16+ characters. While it is set, every payment route (except Paystack's own
//                          webhook, which must always get through) answers 404 unless the browser carries the
//                          gate cookie, and the offer stays hidden. Open  /api/preview?key=<the secret>  once in
//                          the browser to get the cookie. Remove the variable (and redeploy) to open payments to all.

const COOKIE = "cm_gate";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function previewKey(): string | null {
  const k = process.env.PAYMENTS_PREVIEW_KEY;
  return k && k.length >= 16 ? k : null;
}

/** True while payments are on AND the gate is closed to the public. */
export function gateActive(): boolean {
  return PAYMENTS_MODE !== "off" && previewKey() !== null;
}

export function keyMatches(given: string): boolean {
  const key = previewKey();
  if (!key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The signed cookie value that lets a browser through the gate for a week. */
export function gateCookie(): { name: string; value: string; maxAge: number } {
  const payload = `gate.${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}`;
  return { name: COOKIE, value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

function hasGateCookie(req: NextRequest): boolean {
  const value = req.cookies.get(COOKIE)?.value;
  if (!value) return false;
  const cut = value.lastIndexOf(".");
  const payload = value.slice(0, cut);
  if (cut < 0 || !verifySignature(payload, value.slice(cut + 1))) return false;
  const expires = Number(payload.split(".")[1]);
  return Number.isFinite(expires) && expires > Date.now() / 1000;
}

/** May this request use the payment routes? Always yes when there is no gate; otherwise only with the cookie. */
export function gateAllows(req: NextRequest): boolean {
  if (!gateActive()) return true;
  try {
    return hasGateCookie(req);
  } catch {
    return false; // a misconfigured secret closes the gate rather than opening it
  }
}
