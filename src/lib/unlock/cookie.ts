import type { NextRequest, NextResponse } from "next/server";
import { sign, verifySignature } from "@/lib/payments/signing";

// SERVER ONLY. "This browser has paid to reveal these results", in its own signed cookie (separate from the plan's
// cm_entitlement: buying a result never opens a plan, and a plan never needs this). Only /api/unlock/verify writes it, after
// the payment provider confirmed the payment; it cannot be edited because it is signed, and the signature is bound to this
// cookie's name so a value copied from another cookie is refused. A refunded payment is checked again in access.ts.

const COOKIE = "cm_unlock";
const MAX_ITEMS = 25;
const ONE_YEAR_SECONDS = 365 * 24 * 60 * 60;
const LIFETIME_MS = ONE_YEAR_SECONDS * 1000 + 24 * 60 * 60 * 1000;

interface Item {
  s: string; // major slug
  r: string; // payment reference
  t: number; // when it was verified
}

const bind = (body: string) => `unlock-cookie:${body}`;

function encode(items: Item[]): string {
  const body = Buffer.from(JSON.stringify({ v: 1, items })).toString("base64url");
  return `${body}.${sign(bind(body))}`;
}

function decode(value: string | undefined): Item[] {
  if (!value) return [];
  const [body, signature] = value.split(".");
  if (!body || !signature || !verifySignature(bind(body), signature)) return [];
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!Array.isArray(parsed?.items)) return [];
    const now = Date.now();
    return (parsed.items as Item[]).filter((i) => typeof i?.s === "string" && typeof i?.r === "string" && !(typeof i.t === "number" && now - i.t > LIFETIME_MS));
  } catch {
    return [];
  }
}

/** The payment reference this browser's cookie holds for a major, if any. */
export function unlockReference(req: NextRequest, slug: string): string | null {
  return decode(req.cookies.get(COOKIE)?.value).find((i) => i.s === slug)?.r ?? null;
}

/** Adds a verified purchase to the cookie on `res` (keeps earlier ones; paying twice for one major changes nothing). */
export function grantUnlock(req: NextRequest, res: NextResponse, slug: string, reference: string): void {
  const items = decode(req.cookies.get(COOKIE)?.value).filter((i) => i.s !== slug);
  items.push({ s: slug, r: reference, t: Date.now() });
  res.cookies.set(COOKIE, encode(items.slice(-MAX_ITEMS)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}
