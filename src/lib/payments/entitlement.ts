import type { NextRequest, NextResponse } from "next/server";
import { sign, verifySignature } from "./signing";

// Server-only. "This browser has paid for these majors", remembered in a signed cookie that stays on the browser
// for a year (no account needed), so a buyer who closes the app and comes back still has their plan. The cookie
// can only be created by /api/checkout/verify (or /api/checkout/restore) after the provider confirmed the payment,
// and it cannot be edited because it is signed. A refunded payment is checked separately (see access.ts).

const COOKIE = "cm_entitlement";
const MAX_ITEMS = 25;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
// The browser drops the cookie after a year. The server also stops honouring an item once it is older than that (plus
// a day of slack), so a copy of the cookie that someone kept or passed on does not work forever.
const LIFETIME_MS = ONE_YEAR_SECONDS * 1000 + 24 * 60 * 60 * 1000;

interface Item {
  s: string; // major slug
  r: string; // payment reference
  t: number; // when it was verified
}

function encode(items: Item[]): string {
  const body = Buffer.from(JSON.stringify({ v: 1, items })).toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(value: string | undefined): Item[] {
  if (!value) return [];
  const [body, signature] = value.split(".");
  if (!body || !signature || !verifySignature(body, signature)) return [];
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!Array.isArray(parsed?.items)) return [];
    const now = Date.now();
    return (parsed.items as Item[]).filter((i) => typeof i?.s === "string" && !(typeof i.t === "number" && now - i.t > LIFETIME_MS));
  } catch {
    return [];
  }
}

export function hasEntitlement(req: NextRequest, majorSlug: string): boolean {
  return decode(req.cookies.get(COOKIE)?.value).some((i) => i.s === majorSlug);
}

/** The payment reference this browser's cookie holds for a major, if any. */
export function entitlementReference(req: NextRequest, majorSlug: string): string | null {
  return decode(req.cookies.get(COOKIE)?.value).find((i) => i.s === majorSlug)?.r ?? null;
}

/** Every major this browser's cookie says it has paid for. */
export function entitledSlugs(req: NextRequest): string[] {
  return decode(req.cookies.get(COOKIE)?.value).map((i) => i.s);
}

/** Adds a verified purchase to the cookie on `res` (keeps earlier ones). */
export function grantEntitlement(req: NextRequest, res: NextResponse, majorSlug: string, reference: string): void {
  const items = decode(req.cookies.get(COOKIE)?.value).filter((i) => i.s !== majorSlug);
  items.push({ s: majorSlug, r: reference, t: Date.now() });
  res.cookies.set(COOKIE, encode(items.slice(-MAX_ITEMS)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS, // survives closing the browser; a refund is caught by access.ts, not by waiting for expiry
  });
}
