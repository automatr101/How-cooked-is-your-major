import { cookies } from "next/headers";
import { PAYMENTS_MODE } from "@/lib/premium";
import { GATE_COOKIE, gateAllowsCookie } from "@/lib/payments/gate";
import { experimentWindow } from "./config";

// SERVER ONLY. While the paid-unlock experiment runs, no page may hand out a score for free: Compare, the leaderboard,
// /share links and the games' reveals check this before showing one. Same rule as the home page: the window is open,
// payments are on, and the private gate (if any) lets this browser in. Reads the cookie, so the page renders per request.
export async function scansLocked(): Promise<boolean> {
  if (PAYMENTS_MODE === "off" || !experimentWindow().active) return false;
  const jar = await cookies();
  return gateAllowsCookie(jar.get(GATE_COOKIE)?.value);
}
