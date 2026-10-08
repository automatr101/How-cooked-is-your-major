import { NextRequest, NextResponse } from "next/server";
import { EMAIL_PATTERN, findMajor } from "@/lib/payments";
import { grantEntitlement } from "@/lib/payments/entitlement";
import { guard, json, readBody } from "@/lib/payments/http";
import { findPaidByEmail, hashEmail, storeEnabled } from "@/lib/payments/store";
import { currentPrice } from "@/lib/payments/price";
import { PAYMENTS_MODE, PRODUCT_NAME } from "@/lib/premium";
import { cleanText } from "@/lib/clean-text";
import { rateLimited } from "@/lib/telegram";

// "Restore with the email you paid with." The buyer's email and the major they are looking at are fingerprinted
// on the server and looked up in the purchases table; if a paid (not refunded) purchase of that major by that
// email exists, the unlock cookie is granted, exactly as after a normal payment.
//
// Guessing is limited, because anyone who knows a buyer's email and major could otherwise unlock that plan:
//   - 6 attempts per hour per visitor (IP), and
//   - 4 attempts per hour per email and major, however many different visitors try.
// Every answer for a miss is the same and takes the same path, so it never reveals whether an email has bought.

const NOT_FOUND = { status: "not_found" };

export async function POST(req: NextRequest) {
  if (PAYMENTS_MODE !== "live") return json({ error: "not_available" }, 404);
  const blocked = guard(req, "checkout-restore", 6);
  if (blocked) return blocked;
  if (!storeEnabled()) return json({ status: "unavailable" }, 503);

  const body = await readBody(req);
  const major = findMajor(body?.major);
  const email = cleanText(body?.email, 120);
  if (!major || !EMAIL_PATTERN.test(email)) return json(NOT_FOUND);

  let hash: string;
  try {
    hash = hashEmail(email);
  } catch {
    console.error("[restore] EMAIL_HASH_SECRET is not set");
    return json({ status: "unavailable" }, 503);
  }
  if (rateLimited(`restore-email:${major.slug}:${hash}`, 4, 60 * 60 * 1000)) return json({ status: "too_many" }, 429);

  let reference: string | null;
  try {
    reference = await findPaidByEmail(major.slug, hash);
  } catch {
    console.error("[restore] could not look up a purchase");
    return json({ status: "unavailable" }, 503);
  }
  if (!reference) return json(NOT_FOUND);

  const price = currentPrice();
  const out = NextResponse.json(
    { status: "success", transactionId: reference, value: price.value, currency: price.currency, itemName: PRODUCT_NAME },
    { headers: { "Cache-Control": "no-store" } }
  );
  grantEntitlement(req, out, major.slug, reference);
  return out;
}
