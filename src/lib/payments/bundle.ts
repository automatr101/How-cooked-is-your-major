// SERVER ONLY. The 3-major bundle: one payment, the Survival Plan for three majors (for people choosing between them).
//
//   Price: US$9.99 through Stripe; in any other currency (Paystack, GHS) twice the single plan price: GHS 46.90 -> GHS 93.80.
//   Launch and comeback discounts apply to the single plan only, never to the bundle.
//
// A bundle is one payment reference. The provider metadata carries product = BUNDLE_PRODUCT_ID and the three slugs joined with
// commas, so verify (and the webhooks) can check the payment is exactly this bundle. The purchases table stores it in one row
// whose major_slug is "bundle|a|b|c|", so a refund (by reference) removes all three, and "restore with your email" finds it
// for any of the three majors. The unlock cookie gets one entry per major, all with the same reference.

import { PRODUCT_ID } from "@/lib/premium";
import { canonicalMajor, majors as allMajors, type Major } from "@/lib/data";
import { slugify } from "@/lib/analytics";

export const BUNDLE_SIZE = 3;
export const BUNDLE_PRODUCT_ID = `${PRODUCT_ID}-bundle-3`;
export const BUNDLE_USD_MINOR = 999;

export type BundleMajor = Major & { slug: string };

/** The bundle price in the currency charged: $9.99, or twice the single price in any other currency. */
export function bundleMinor(currency: string, singleMinor: number): number {
  return currency === "USD" ? BUNDLE_USD_MINOR : singleMinor * 2;
}

/** Three different real majors by exact name, or null. */
export function findBundle(names: unknown): BundleMajor[] | null {
  if (!Array.isArray(names) || names.length !== BUNDLE_SIZE) return null;
  // Looked up here rather than through ./index, which imports the providers (and they import this file)
  const found = names.map((n) => {
    const m = typeof n === "string" ? canonicalMajor(n) : undefined;
    return m ? { ...m, slug: slugify(m.name) } : null;
  });
  if (found.some((m) => !m)) return null;
  const majors = found as BundleMajor[];
  return new Set(majors.map((m) => m.slug)).size === BUNDLE_SIZE ? majors : null;
}

/** What the provider metadata holds: the slugs joined with commas. */
export const bundleMetaSlugs = (majors: { slug: string }[]): string => majors.map((m) => m.slug).join(",");

/** What the purchases table holds in major_slug for a bundle. */
export const bundleKey = (majors: { slug: string }[]): string => `bundle|${majors.map((m) => m.slug).join("|")}|`;

/** The majors named by provider metadata (comma-joined slugs), or null. Used by the webhooks. */
export function bundleFromMetaSlugs(raw: unknown): BundleMajor[] | null {
  if (typeof raw !== "string") return null;
  const slugs = raw.split(",");
  const majors = slugs.map((s) => {
    const m = allMajors.find((x) => slugify(x.name) === s);
    return m ? { ...m, slug: s } : null;
  });
  return majors.length === BUNDLE_SIZE && majors.every(Boolean) && new Set(slugs).size === BUNDLE_SIZE ? (majors as BundleMajor[]) : null;
}

/** Does a stored major_slug (single or bundle) cover this major? */
export function coversMajor(storedSlug: string, slug: string): boolean {
  return storedSlug === slug || (storedSlug.startsWith("bundle|") && storedSlug.includes(`|${slug}|`));
}
