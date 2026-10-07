import { NextRequest } from "next/server";
import { gateActive, gateAllows } from "@/lib/payments/gate";
import { json } from "@/lib/payments/http";
import { PAYMENTS_MODE } from "@/lib/premium";

// Tells the page whether to show the paid offer to THIS visitor: payments must be on, and if the private gate is
// closed the browser must carry the gate cookie. One source of truth, so the page and the payment routes can
// never disagree. `gated` lets analytics label test runs so they never count as real revenue.

export async function GET(req: NextRequest) {
  if (PAYMENTS_MODE === "off") return json({ enabled: false, gated: false });
  return json({ enabled: gateAllows(req), gated: gateActive() });
}
