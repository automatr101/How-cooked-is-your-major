import { randomBytes } from "node:crypto";
import { majors, type Major } from "@/lib/data";
import { PAYMENTS_MODE } from "@/lib/premium";
import { slugify } from "@/lib/analytics";
import { mockProvider } from "./mock";
import { paystackProvider } from "./paystack";
import { stripeAudience, stripeEnabled, stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

// The only place that decides which provider is in use. Everything else asks for `getProvider()`.

/** The provider for the current mode, or null when payments are off. */
export function getProvider(): PaymentProvider | null {
  if (PAYMENTS_MODE === "test") return mockProvider;
  if (PAYMENTS_MODE === "live") return paystackProvider;
  return null;
}

/**
 * The provider for THIS visitor when a payment starts: Stripe (US dollars) for visitors outside Ghana when Stripe is switched on,
 * otherwise whatever the mode says (Paystack in Ghana). Verifying does not use this: a Stripe return carries a session id and
 * goes to Stripe, everything else goes to getProvider().
 */
export function getProviderFor(country: string | null): PaymentProvider | null {
  if (stripeEnabled() && stripeAudience(country)) return stripeProvider;
  return getProvider();
}

/** Looks a major up by its exact name, on the server, so only real majors can be bought. */
export function findMajor(name: unknown): (Major & { slug: string }) | null {
  if (typeof name !== "string") return null;
  const m = majors.find((x) => x.name === name);
  return m ? { ...m, slug: slugify(m.name) } : null;
}

export const REFERENCE_PATTERN = /^cm-[a-z0-9]{6,12}-[a-f0-9]{12}$/;

export function newReference(): string {
  return `cm-${Date.now().toString(36)}-${randomBytes(6).toString("hex")}`;
}

export const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
