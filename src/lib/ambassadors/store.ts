// SERVER ONLY. The campus ambassador program (SQL in db/ambassadors.sql). Same access model as purchases, reviews and leads:
// the secret service key, Row Level Security on, no public policies.
//
// How a sale is credited:
//   1. A visitor arrives by /?ref=<code>. /api/ref checks the code and puts it in a cookie for 30 days (the last link clicked wins).
//   2. When that visitor starts a checkout, /api/checkout/initialize writes a 'started' referral for the payment reference.
//      A buyer using the ambassador's own email is not credited.
//   3. When the payment is verified (browser or webhook, whichever is first), registerPurchase turns it 'paid' and fixes the
//      commission at the rate in force then.
//   4. A refund is read from the purchases table at display time, so a refunded sale earns nothing.
// The owner pays commissions out by hand and marks them paid in /admin/ambassadors.

import { randomBytes } from "node:crypto";
import { hashEmail, storeEnabled } from "@/lib/payments/store";
import { sign, verifySignature } from "@/lib/payments/signing";

export const ambassadorsEnabled = storeEnabled;

/** The ambassador's cut of each plan sold through their link. Changing it only affects sales from then on. */
export const COMMISSION_PERCENT = 20;
export const REF_COOKIE = "cm_ref";
export const REF_DAYS = 30;
export const CODE_PATTERN = /^[a-z0-9-]{4,24}$/;

export class AmbassadorStoreError extends Error {}

export interface AmbassadorRow {
  id: string;
  created_at: string;
  code: string;
  name: string;
  email: string;
  email_hash: string | null;
  campus: string;
  status: "active" | "paused";
  clicks: number;
}

export interface ReferralRow {
  reference: string;
  created_at: string;
  code: string;
  status: "started" | "paid";
  amount_minor: number | null;
  currency: string | null;
  commission_minor: number | null;
  paid_at: string | null;
  payout_at: string | null;
}

async function call(table: string, path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown[]> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/${table}${path}`, {
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
    throw new AmbassadorStoreError("database unreachable");
  }
  if (!res.ok) throw new AmbassadorStoreError(`database answered ${res.status}`); // never include the body: it may echo an address
  const text = await res.text();
  const parsed = text ? JSON.parse(text) : [];
  return Array.isArray(parsed) ? parsed : [parsed];
}

const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

function safeHash(email: string): string | null {
  try {
    return hashEmail(email);
  } catch {
    return null;
  }
}

/** "Ama Mensah" -> "ama-k3x9": the first name plus 4 random characters, so codes are friendly but not guessable in bulk. */
export function newCode(name: string): string {
  const first = name.normalize("NFKD").replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/)[0]?.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14) || "campus";
  const tail = Array.from(randomBytes(4), (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
  return `${first.length >= 2 ? first : "campus"}-${tail}`;
}

/** Signs a new ambassador up. Returns the row when new, null when that email is already an ambassador. */
export async function createAmbassador(input: { name: string; email: string; campus: string }): Promise<AmbassadorRow | null> {
  const email = input.email.trim().toLowerCase();
  const existing = await call("ambassadors", `?select=id&email=${eq(email)}&limit=1`);
  if (existing.length) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const rows = (await call("ambassadors", "", {
        method: "POST",
        body: JSON.stringify({ code: newCode(input.name), name: input.name, email, email_hash: safeHash(email), campus: input.campus }),
        prefer: "return=representation",
      })) as AmbassadorRow[];
      return rows[0] ?? null;
    } catch (err) {
      // 409 = a unique value clashed: the code (try another) or the email (signed up a moment ago in another tab)
      if (!(err instanceof AmbassadorStoreError && err.message.endsWith("409"))) throw err;
      const again = await call("ambassadors", `?select=id&email=${eq(email)}&limit=1`);
      if (again.length) return null;
    }
  }
  throw new AmbassadorStoreError("could not make a unique code");
}

export async function ambassadorByCode(code: string): Promise<AmbassadorRow | null> {
  if (!CODE_PATTERN.test(code)) return null;
  const rows = (await call("ambassadors", `?select=*&code=${eq(code)}&limit=1`)) as AmbassadorRow[];
  return rows[0] ?? null;
}

export async function ambassadorById(id: string): Promise<AmbassadorRow | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const rows = (await call("ambassadors", `?select=*&id=${eq(id)}&limit=1`)) as AmbassadorRow[];
  return rows[0] ?? null;
}

/** +1 visit for an active code. Returns false when the code is unknown or paused. */
export async function countClick(code: string): Promise<boolean> {
  const rows = await call("rpc/ambassador_click", "", { method: "POST", body: JSON.stringify({ p_code: code }) });
  return rows.some((r) => r === true);
}

/** A checkout started by a visitor who came through an ambassador's link. Returns the code when it was recorded. */
export async function startReferral(reference: string, code: string, buyerEmail: string): Promise<string | null> {
  const amb = await ambassadorByCode(code);
  if (!amb || amb.status !== "active") return null;
  const buyer = safeHash(buyerEmail);
  if (amb.email === buyerEmail.trim().toLowerCase() || (buyer && amb.email_hash === buyer)) return null; // no commission on your own purchase
  await call("referrals", "?on_conflict=reference", {
    method: "POST",
    body: JSON.stringify({ reference, code }),
    prefer: "resolution=ignore-duplicates",
  });
  return code;
}

export function commissionOf(amountMinor: number): number {
  return Math.round((amountMinor * COMMISSION_PERCENT) / 100);
}

/** The payment for a referred checkout was verified. Returns the ambassador's code the first time, null otherwise. */
export async function creditReferral(reference: string, paid: { amount: number; currency: string }): Promise<string | null> {
  const rows = (await call("referrals", `?reference=${eq(reference)}&status=eq.started`, {
    method: "PATCH",
    body: JSON.stringify({ status: "paid", amount_minor: paid.amount, currency: paid.currency, commission_minor: commissionOf(paid.amount), paid_at: new Date().toISOString() }),
    prefer: "return=representation",
  })) as ReferralRow[];
  return rows[0]?.code ?? null;
}

// ---- the ambassador's private stats link: /ambassadors/me?t=<id>.<signature>

export function dashboardToken(id: string): string {
  return `${id}.${sign(`ambassador:${id}`)}`;
}

export function idFromToken(token: string): string | null {
  const [id, signature] = token.split(".");
  if (!id || !signature || !/^[0-9a-f-]{36}$/.test(id)) return null;
  return verifySignature(`ambassador:${id}`, signature) ? id : null;
}

// ---- totals

export interface Totals {
  clicks: number;
  started: number;
  sales: number;
  refunded: number;
  /**
   * Per currency, in the smallest unit, on sales that were not refunded: everything earned; pending (inside the refund window,
   * not payable yet); owed (payable, not paid out yet); paid out.
   */
  money: Record<string, { earned: number; pending: number; owed: number; paidOut: number }>;
}

/** A sale becomes payable this many days after it, once the 7-day guarantee has run out. */
export const HOLD_DAYS = 8;
const payable = (r: ReferralRow, now: number) => !!r.paid_at && now - Date.parse(r.paid_at) >= HOLD_DAYS * 24 * 3600 * 1000;

async function refundedRefs(references: string[]): Promise<Set<string>> {
  const out = new Set<string>();
  for (let i = 0; i < references.length; i += 100) {
    const batch = references.slice(i, i + 100).map((r) => `"${r.replace(/"/g, "")}"`).join(",");
    const rows = (await call("purchases", `?select=reference&status=eq.refunded&reference=in.(${encodeURIComponent(batch)})`)) as { reference: string }[];
    rows.forEach((r) => out.add(r.reference));
  }
  return out;
}

function sum(clicks: number, rows: ReferralRow[], refunded: Set<string>): Totals {
  const t: Totals = { clicks, started: rows.length, sales: 0, refunded: 0, money: {} };
  const now = Date.now();
  for (const r of rows) {
    if (r.status !== "paid" || !r.currency || r.commission_minor == null) continue;
    if (refunded.has(r.reference)) {
      t.refunded++;
      continue;
    }
    t.sales++;
    const m = (t.money[r.currency] ??= { earned: 0, pending: 0, owed: 0, paidOut: 0 });
    m.earned += r.commission_minor;
    if (r.payout_at) m.paidOut += r.commission_minor;
    else if (payable(r, now)) m.owed += r.commission_minor;
    else m.pending += r.commission_minor;
  }
  return t;
}

export async function totalsFor(amb: AmbassadorRow): Promise<Totals> {
  const rows = (await call("referrals", `?select=*&code=${eq(amb.code)}&order=created_at.desc&limit=2000`)) as ReferralRow[];
  return sum(amb.clicks, rows, await refundedRefs(rows.filter((r) => r.status === "paid").map((r) => r.reference)));
}

/** Every ambassador with their totals, newest first (for the owner). */
export async function listForAdmin(): Promise<(AmbassadorRow & { totals: Totals })[]> {
  const ambs = (await call("ambassadors", "?select=*&order=created_at.desc&limit=500")) as AmbassadorRow[];
  const refs = (await call("referrals", "?select=*&limit=10000")) as ReferralRow[];
  const refunded = await refundedRefs(refs.filter((r) => r.status === "paid").map((r) => r.reference));
  return ambs.map((a) => ({ ...a, totals: sum(a.clicks, refs.filter((r) => r.code === a.code), refunded) }));
}

/**
 * The owner paid this ambassador: marks every commission owed right now as paid out. Refunded sales and sales still inside
 * the refund window are left alone (they are not owed yet). Returns how many sales were marked.
 */
export async function markPaidOut(id: string): Promise<number> {
  const amb = await ambassadorById(id);
  if (!amb) return 0;
  const rows = (await call("referrals", `?select=*&code=${eq(amb.code)}&status=eq.paid&payout_at=is.null`)) as ReferralRow[];
  const refunded = await refundedRefs(rows.map((r) => r.reference));
  const now = Date.now();
  const owed = rows.filter((r) => payable(r, now) && !refunded.has(r.reference)).map((r) => r.reference);
  if (!owed.length) return 0;
  const list = owed.map((r) => `"${r.replace(/"/g, "")}"`).join(",");
  const done = await call("referrals", `?reference=in.(${encodeURIComponent(list)})&payout_at=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ payout_at: new Date().toISOString() }),
    prefer: "return=representation",
  });
  return done.length;
}

export async function setAmbassadorStatus(id: string, status: "active" | "paused"): Promise<void> {
  if (!/^[0-9a-f-]{36}$/.test(id)) throw new AmbassadorStoreError("bad id");
  await call("ambassadors", `?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
}

export function money(minor: number, currency: string): string {
  return currency === "USD" ? `$${(minor / 100).toFixed(2)}` : `${currency} ${(minor / 100).toFixed(2)}`;
}
