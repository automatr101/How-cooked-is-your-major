import type { NextRequest, NextResponse } from "next/server";
import { sign, verifySignature } from "./signing";

// Server-only. "This browser has paid for these majors", remembered in a signed cookie that lasts for the
// browser session (no account needed). The cookie can only be created by /api/checkout/verify after the
// provider confirmed the payment, and it cannot be edited because it is signed.

const COOKIE = "cm_entitlement";
const MAX_ITEMS = 25;

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
    return Array.isArray(parsed?.items) ? (parsed.items as Item[]).filter((i) => typeof i?.s === "string") : [];
  } catch {
    return [];
  }
}

export function hasEntitlement(req: NextRequest, majorSlug: string): boolean {
  return decode(req.cookies.get(COOKIE)?.value).some((i) => i.s === majorSlug);
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
    // no maxAge: it is a session cookie, gone when the browser is closed
  });
}
