// SERVER ONLY. The leads table in Supabase (SQL in db/leads.sql). Same access model as purchases and reviews: the secret
// service key, Row Level Security on, no public policies. A lead is a real address that agreed to the 3-email sequence.

import { randomBytes } from "node:crypto";
import { storeEnabled } from "@/lib/payments/store";

export const leadsEnabled = storeEnabled;

export class LeadStoreError extends Error {}

export interface LeadRow {
  id: string;
  created_at: string;
  email: string;
  major_slug: string;
  score: number;
  ref: string | null;
  unsubscribe_token: string;
  unsubscribed_at: string | null;
  day0_sent_at: string | null;
  day1_sent_at: string | null;
  day2_sent_at: string | null;
  score_alerts: boolean;
  alerted_score: number | null;
}

export type Day = 0 | 1 | 2;
const SENT_COLUMN = { 0: "day0_sent_at", 1: "day1_sent_at", 2: "day2_sent_at" } as const;

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<unknown[]> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/leads${path}`, {
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
    throw new LeadStoreError("database unreachable");
  }
  if (!res.ok) throw new LeadStoreError(`database answered ${res.status}`); // never include the body: it may echo an address
  const text = await res.text();
  return text ? (JSON.parse(text) as unknown[]) : [];
}

const eq = (v: string) => `eq.${encodeURIComponent(v)}`;

/** Saves a lead. Returns the row when it is new, null when that address was already on the list. */
export async function addLead(input: { email: string; major_slug: string; score: number; ref: string | null; country: string | null; score_alerts: boolean }): Promise<LeadRow | null> {
  const rows = (await call("?on_conflict=email", {
    method: "POST",
    body: JSON.stringify({ ...input, email: input.email.trim().toLowerCase(), unsubscribe_token: randomBytes(24).toString("hex") }),
    prefer: "resolution=ignore-duplicates,return=representation",
  })) as LeadRow[];
  return rows[0] ?? null;
}

export async function markSent(id: string, day: Day): Promise<void> {
  await call(`?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ [SENT_COLUMN[day]]: new Date().toISOString() }) });
}

/**
 * Leads whose day-N email is due and not sent yet: not unsubscribed, at least N days old, and the earlier email went out at least 20 hours ago.
 * Day 0 is the catch-up for signups that happened while sending was off or failed: only the last 48 hours, so switching
 * sending on later never mails someone who signed up weeks ago.
 */
export async function dueLeads(day: Day, limit = 40): Promise<LeadRow[]> {
  const cutoff = new Date(Date.now() - day * 24 * 3600 * 1000).toISOString();
  const gap = new Date(Date.now() - 20 * 3600 * 1000).toISOString(); // never two emails in one run, even after a missed day
  const earlier = day === 0 ? `created_at=gte.${encodeURIComponent(new Date(Date.now() - 48 * 3600 * 1000).toISOString())}` : day === 1 ? `day0_sent_at=lte.${encodeURIComponent(gap)}` : `day1_sent_at=lte.${encodeURIComponent(gap)}`;
  return (await call(
    `?select=*&unsubscribed_at=is.null&${SENT_COLUMN[day]}=is.null&${earlier}&created_at=lte.${encodeURIComponent(cutoff)}&order=created_at.asc&limit=${limit}`
  )) as LeadRow[];
}

/** Subscribed leads who opted in to score-change alerts (the caller compares scores: they live in the site's code, not the database). */
export async function scoreAlertLeads(limit = 2000): Promise<LeadRow[]> {
  return (await call(`?select=*&score_alerts=is.true&unsubscribed_at=is.null&order=created_at.asc&limit=${limit}`)) as LeadRow[];
}

/** Remembers the score we just told this lead about, so the same change is never emailed twice. */
export async function markAlerted(id: string, score: number): Promise<void> {
  await call(`?id=${eq(id)}`, { method: "PATCH", body: JSON.stringify({ alerted_score: score }) });
}

/** Unsubscribes by the secret token from an email's link. Returns true when a subscribed lead was changed. */
export async function unsubscribe(token: string): Promise<boolean> {
  if (!/^[a-f0-9]{48}$/.test(token)) return false;
  const rows = await call(`?unsubscribe_token=${eq(token)}&unsubscribed_at=is.null`, {
    method: "PATCH",
    body: JSON.stringify({ unsubscribed_at: new Date().toISOString() }),
    prefer: "return=representation",
  });
  return rows.length > 0;
}
