import type { NextRequest } from "next/server";
import { PAYMENTS_MODE } from "@/lib/premium";
import { mayRead } from "@/lib/payments/access";
import { statusOf, storeEnabled } from "@/lib/payments/store";
import { gateAllows } from "@/lib/payments/gate";
import { experimentWindow } from "./config";
import { unlockReference } from "./cookie";

// SERVER ONLY. May this browser see the result for this major right now?
//   - the experiment is not running for this visitor (off, ended, or the private gate is closed to them): yes, it is free
//   - they paid to unlock it (signed cookie, and the payment was not refunded since): yes
//   - they own the Survival Plan for it (they paid more): yes
//   - otherwise: no
// A database problem never locks out someone who paid (it fails open, as everywhere else in the payment code).

/** Is the paywall in force for THIS request? The window is open, payments are on, and the private gate (if any) lets them in. */
export function experimentActiveFor(req: NextRequest, now: number = Date.now()): boolean {
  return PAYMENTS_MODE !== "off" && experimentWindow(now).active && gateAllows(req);
}

export async function mayView(req: NextRequest, slug: string): Promise<boolean> {
  if (!experimentActiveFor(req)) return true;
  const reference = unlockReference(req, slug);
  if (reference) {
    if (PAYMENTS_MODE === "live" && storeEnabled()) {
      try {
        if ((await statusOf(reference)) === "refunded") return mayRead(req, slug);
      } catch {
        console.error("[unlock] could not check the refund status");
      }
    }
    return true;
  }
  return mayRead(req, slug);
}
