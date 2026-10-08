import type { NextRequest } from "next/server";
import { PAYMENTS_MODE } from "@/lib/premium";
import { entitlementReference } from "./entitlement";
import { statusOf, storeEnabled } from "./store";

// SERVER ONLY. May this browser read (or download) the paid plan for this major? The signed cookie says it paid,
// and because the cookie now lasts a year, a payment that was refunded since then must stop working: with the
// purchase records on, the payment behind the cookie is looked up and a refunded one is refused. A database
// problem never locks out a paying customer (it fails open, as everywhere else in the payment code).

export async function mayRead(req: NextRequest, majorSlug: string): Promise<boolean> {
  const reference = entitlementReference(req, majorSlug);
  if (!reference) return false;
  if (PAYMENTS_MODE === "live" && storeEnabled()) {
    try {
      if ((await statusOf(reference)) === "refunded") return false;
    } catch {
      console.error("[access] could not check the refund status"); // no details: keep the log free of anything about the buyer
    }
  }
  return true;
}
