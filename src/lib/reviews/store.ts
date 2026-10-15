// SERVER ONLY. The reviews table in Supabase (SQL in db/reviews.sql). Same access model as the purchases table: the
// secret service key, a table with Row Level Security on and no public policies. The key never reaches the browser.
//
// Everything here stores REAL submissions only. There is no sample data, no seed, and no fallback list anywhere: when
// the table is empty (or not set up), the public numbers are zero and the site shows no reviews at all.

import { storeEnabled } from "@/lib/payments/store";

import { MIN_RATINGS_FOR_AVERAGE } from "./min";
export { MIN_RATINGS_FOR_AVERAGE };

export type ReviewKind = "free_feedback" | "verified_purchase";
export type ReviewStatus = "pending" | "approved" | "hidden";

export interface ReviewRow {
  id: string;
  created_at: string;
  kind: ReviewKind;
  major_slug: string | null;
  accurate: boolean | null;
  rating: number | null;
  comment: string | null;
  consent_display: boolean;
  display_name: string | null;
  country: string | null;
  purchase_reference: string | null;
  status: ReviewStatus;
}

export type NewReview = Omit<ReviewRow, "id" | "created_at" | "status"> & { status?: ReviewStatus };

export class ReviewStoreError extends Error {}

export const reviewsEnabled = storeEnabled;

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown[]> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/reviews${path}`, {
      ...init,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(init.prefer ? { Prefer: init.prefer } : {}),
      },
      signal: AbortSignal.timeout(6000),
    });
  } catch {
    throw new ReviewStoreError("database unreachable");
  }
  if (res.status === 409) throw new ReviewStoreError("duplicate");
  if (!res.ok) throw new ReviewStoreError(`database answered ${res.status}`); // never include the body: it may echo values
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown[]) : [];
}

const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

/** Saves one review. Throws ReviewStoreError("duplicate") if that purchase already has one. */
export async function insertReview(row: NewReview): Promise<void> {
  await call("", { method: "POST", body: JSON.stringify(row), prefer: "return=minimal" });
}

/** The payment references that already have a verified review, from this list. */
export async function hasVerifiedReview(reference: string): Promise<boolean> {
  const rows = await call(`?select=id&purchase_reference=${eq(reference)}&limit=1`);
  return rows.length > 0;
}

// ---- what the public sees ----------------------------------------------------------------------------------------

export interface PublicReview {
  label: "Verified purchase" | "Free scan feedback";
  rating: number | null;
  comment: string;
  name: string;
  major: string | null;
  country: string | null;
  date: string;
}

export interface PublicReviews {
  enabled: boolean;
  verified: { count: number; average: number | null };
  free: { ratingCount: number; average: number | null; accurateYes: number; accurateTotal: number; accuracyPercent: number | null };
  items: PublicReview[];
}

export const EMPTY_PUBLIC: PublicReviews = {
  enabled: false,
  verified: { count: 0, average: null },
  free: { ratingCount: 0, average: null, accurateYes: 0, accurateTotal: 0, accuracyPercent: null },
  items: [],
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: number[]) => (xs.length >= MIN_RATINGS_FOR_AVERAGE ? round1(xs.reduce((a, b) => a + b, 0) / xs.length) : null);

/**
 * Only APPROVED reviews count, for the numbers and for the quotes. An average is returned only once there are at least
 * MIN_RATINGS_FOR_AVERAGE ratings of that kind; before that the count is all anyone sees. A quote is shown only if the
 * person agreed to show their name, major and country.
 */
export async function publicReviews(majorSlug: string | null, nameOf: (slug: string) => string | null): Promise<PublicReviews> {
  if (!reviewsEnabled()) return EMPTY_PUBLIC;
  const rows = (await call(
    `?select=kind,rating,accurate,comment,consent_display,display_name,country,major_slug,created_at&status=eq.approved&order=created_at.desc&limit=5000`
  )) as Pick<ReviewRow, "kind" | "rating" | "accurate" | "comment" | "consent_display" | "display_name" | "country" | "major_slug" | "created_at">[];

  const verified = rows.filter((r) => r.kind === "verified_purchase" && r.rating != null).map((r) => r.rating as number);
  const free = rows.filter((r) => r.kind === "free_feedback" && r.rating != null).map((r) => r.rating as number);
  const votes = rows.filter((r) => r.accurate != null);
  const yes = votes.filter((r) => r.accurate).length;

  const quotable = rows.filter((r) => r.consent_display && r.display_name && r.comment && r.comment.trim());
  // Quotes for this major first, then the newest from anywhere; verified purchases before free feedback at equal rank
  const rank = (r: (typeof quotable)[number]) => (majorSlug && r.major_slug === majorSlug ? 0 : 2) + (r.kind === "verified_purchase" ? 0 : 1);
  const items = [...quotable]
    .sort((a, b) => rank(a) - rank(b) || b.created_at.localeCompare(a.created_at))
    .slice(0, 6)
    .map<PublicReview>((r) => ({
      label: r.kind === "verified_purchase" ? "Verified purchase" : "Free scan feedback",
      rating: r.rating,
      comment: (r.comment ?? "").trim(),
      name: r.display_name as string,
      major: r.major_slug ? nameOf(r.major_slug) : null,
      country: r.country,
      date: r.created_at,
    }));

  return {
    enabled: true,
    verified: { count: verified.length, average: avg(verified) },
    free: {
      ratingCount: free.length,
      average: avg(free),
      accurateYes: yes,
      accurateTotal: votes.length,
      accuracyPercent: votes.length >= MIN_RATINGS_FOR_AVERAGE ? Math.round((yes / votes.length) * 100) : null,
    },
    items,
  };
}

// ---- the admin view ------------------------------------------------------------------------------------------------

export async function listForAdmin(): Promise<ReviewRow[]> {
  if (!reviewsEnabled()) return [];
  return (await call(`?select=*&order=created_at.desc&limit=300`)) as ReviewRow[];
}

export async function setStatus(id: string, status: ReviewStatus): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const rows = await call(`?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ status }), prefer: "return=representation" });
  return rows.length > 0;
}
