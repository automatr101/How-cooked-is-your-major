import { createHmac, timingSafeEqual } from "node:crypto";
import { PAYMENTS_MODE } from "@/lib/premium";

// Server-only. Signs small strings (test-mode proofs and the unlock cookie) so they cannot be forged
// from the browser. The secret is PAYMENT_SESSION_SECRET. Test mode alone may fall back to a built-in
// secret, which is fine because test mode unlocks nothing that costs money; live mode refuses to run
// without a real one.

const TEST_FALLBACK = "major-intelligence-test-mode-secret-do-not-use-live";

function secret(): string {
  const s = process.env.PAYMENT_SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (PAYMENTS_MODE === "test") return TEST_FALLBACK;
  throw new Error("PAYMENT_SESSION_SECRET is not set (at least 16 characters)");
}

export function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function verifySignature(payload: string, signature: string): boolean {
  try {
    const a = Buffer.from(sign(payload));
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
