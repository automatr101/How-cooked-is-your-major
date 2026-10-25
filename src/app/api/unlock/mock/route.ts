import { NextRequest } from "next/server";
import { findMajor, REFERENCE_PATTERN } from "@/lib/payments";
import { guard, json, readBody } from "@/lib/payments/http";
import { makeProof, MOCK_OUTCOMES, type MockOutcome } from "@/lib/payments/mock";
import { PAYMENTS_MODE } from "@/lib/premium";

// TEST MODE ONLY: the fake checkout posts the outcome the tester chose and gets back a server-signed proof for an UNLOCK
// (a plan proof cannot be replayed here, see mock.ts). In live mode (or with payments off) this route does not exist.

export async function POST(req: NextRequest) {
  if (PAYMENTS_MODE !== "test") return json({ error: "not_available" }, 404);
  const blocked = guard(req, "unlock-mock", 60);
  if (blocked) return blocked;

  const body = await readBody(req);
  const major = findMajor(body?.major);
  const reference = typeof body?.reference === "string" ? body.reference : "";
  const outcome = body?.outcome as MockOutcome;
  if (!major || !REFERENCE_PATTERN.test(reference) || !MOCK_OUTCOMES.includes(outcome)) return json({ error: "bad_request" }, 400);
  return json({ proof: makeProof(reference, major.slug, outcome, true) });
}
