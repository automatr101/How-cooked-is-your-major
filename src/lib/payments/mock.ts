import { sign, verifySignature } from "./signing";
import type { InitializeInput, InitializeResult, PaymentProvider, VerifyInput, VerifyResult } from "./types";

// TEST MODE ONLY. A stand-in for Paystack so the whole flow can be tried without money. The fake
// checkout page asks /api/checkout/mock for a "proof": the chosen outcome, signed by the server. The
// verify step then trusts only a proof that carries a valid server signature, the same way the live
// provider trusts only Paystack's own answer. Nothing here runs unless NEXT_PUBLIC_PAYMENTS_MODE=test.

export type MockOutcome = "success" | "failed" | "cancelled" | "slow";
export const MOCK_OUTCOMES: MockOutcome[] = ["success", "failed", "cancelled", "slow"];

const SLOW_MS = 6000; // "slow" reports pending until this long after the fake payment
const PROOF_TTL_MS = 60 * 60 * 1000;

function message(reference: string, majorSlug: string, outcome: string, ts: string) {
  return `mock|${reference}|${majorSlug}|${outcome}|${ts}`;
}

export function makeProof(reference: string, majorSlug: string, outcome: MockOutcome): string {
  const ts = String(Date.now());
  return `${outcome}.${ts}.${sign(message(reference, majorSlug, outcome, ts))}`;
}

export const mockProvider: PaymentProvider = {
  id: "mock",

  async initialize({ reference }: InitializeInput): Promise<InitializeResult> {
    return { reference };
  },

  async verify({ reference, majorSlug, proof }: VerifyInput): Promise<VerifyResult> {
    const [outcome, ts, signature] = (proof ?? "").split(".");
    if (!outcome || !ts || !signature) return { status: "failed", reason: "no_payment_found" };
    if (!verifySignature(message(reference, majorSlug, outcome, ts), signature)) return { status: "failed", reason: "invalid_proof" };
    const age = Date.now() - Number(ts);
    if (!(age >= 0) || age > PROOF_TTL_MS) return { status: "failed", reason: "expired" };

    if (outcome === "success") return { status: "success", transactionId: `test_${reference}` };
    if (outcome === "slow") return age >= SLOW_MS ? { status: "success", transactionId: `test_${reference}` } : { status: "pending" };
    if (outcome === "cancelled") return { status: "cancelled" };
    return { status: "failed", reason: "card_declined" };
  },
};
