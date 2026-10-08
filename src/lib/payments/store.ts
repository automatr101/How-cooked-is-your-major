import { createHmac } from "node:crypto";

// SERVER ONLY. The purchases table in Supabase (see the SQL in the project notes / README of the payments work).
// It talks to Supabase's REST interface with the secret service key, which can read and write the table because
// the table has Row Level Security on and no public policies. That key must never reach the browser.
//
//   SUPABASE_URL                 https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    the secret server key (Project Settings > API Keys)
//   EMAIL_HASH_SECRET            32+ random characters; emails are stored only as a keyed hash of this
//
// Everything here is optional: if the settings are missing, storeEnabled() is false and the payment code keeps
// working exactly as before (no database, unlock cookie only).

export interface PurchaseRow {
  reference: string;
  major_slug: string;
  plan_type: "uncooking" | "future_proof" | "advantage";
  amount_minor: number;
  currency: string;
  paystack_id?: string | null;
  email_hash?: string | null;
  status: "paid" | "refunded";
}

export class StoreError extends Error {}

export function storeEnabled(): boolean {
  return !!process.env.SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;
}

/** A keyed, one-way fingerprint of an email address. The address itself is never stored. */
export function hashEmail(email: string): string {
  const secret = process.env.EMAIL_HASH_SECRET;
  if (!secret || secret.length < 16) throw new StoreError("EMAIL_HASH_SECRET is not set");
  return createHmac("sha256", secret).update(email.trim().toLowerCase()).digest("hex");
}

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown[]> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/purchases${path}`, {
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
    throw new StoreError("database unreachable");
  }
  if (!res.ok) throw new StoreError(`database answered ${res.status}`); // never include the body: it may echo values
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown[]) : [];
}

const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

/** Saves a purchase. Returns true if it was new, false if that payment was already recorded (so alerts go out once). */
export async function recordPurchase(row: PurchaseRow): Promise<boolean> {
  const rows = await call("?on_conflict=reference", {
    method: "POST",
    body: JSON.stringify(row),
    prefer: "resolution=ignore-duplicates,return=representation",
  });
  return rows.length > 0;
}

/** Marks a purchase refunded. Returns true if a paid purchase was changed. */
export async function markRefunded(reference: string): Promise<boolean> {
  const rows = await call(`?reference=${eq(reference)}&status=eq.paid`, {
    method: "PATCH",
    body: JSON.stringify({ status: "refunded", refunded_at: new Date().toISOString() }),
    prefer: "return=representation",
  });
  return rows.length > 0;
}

/** Puts a refunded purchase back to paid (Paystack reported the refund failed). Returns true if a refunded purchase was changed. */
export async function markPaid(reference: string): Promise<boolean> {
  const rows = await call(`?reference=${eq(reference)}&status=eq.refunded`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paid", refunded_at: null }),
    prefer: "return=representation",
  });
  return rows.length > 0;
}

export async function statusOf(reference: string): Promise<"paid" | "refunded" | null> {
  const rows = (await call(`?select=status&reference=${eq(reference)}&limit=1`)) as { status: "paid" | "refunded" }[];
  return rows[0]?.status ?? null;
}

/** The reference of a paid (not refunded) purchase of this major by this email, if there is one. */
export async function findPaidByEmail(majorSlug: string, emailHash: string): Promise<string | null> {
  const rows = (await call(`?select=reference&major_slug=${eq(majorSlug)}&email_hash=${eq(emailHash)}&status=eq.paid&limit=1`)) as { reference: string }[];
  return rows[0]?.reference ?? null;
}
