import { NextRequest } from "next/server";
import { findMajor, REFERENCE_PATTERN } from "@/lib/payments";
import { guard, json, readBody } from "@/lib/payments/http";
import { makeProof, MOCK_OUTCOMES, type MockOutcome } from "@/lib/payments/mock";
import { PAYMENTS_MODE } from "@/lib/premium";

// TEST MODE ONLY: the fake checkout page posts the outcome the tester chose, and gets back a server-signed
// proof. In live mode (or when payments are off) this route does not exist.

export async function POST(req: NextRequest) {
  if (PAYMENTS_MODE !== "test") return json({ error: "not_available" }, 404);
  const blocked = guard(req, "checkout-mock", 60);
  if (blocked) return blocked;

  const body = await readBody(req);
  const major = findMajor(body?.major);
  const reference = typeof body?.reference === "string" ? body.reference : "";
  const outcome = body?.outcome as MockOutcome;
  if (!major || !REFERENCE_PATTERN.test(reference) || !MOCK_OUTCOMES.includes(outcome)) return json({ error: "bad_request" }, 400);

  return json({ proof: makeProof(reference, major.slug, outcome) });
}
