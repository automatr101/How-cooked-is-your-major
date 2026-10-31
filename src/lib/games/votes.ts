// SERVER ONLY. Major Wars votes (SQL in db/major_votes.sql). The API only ever hands out percentages, and only past MIN_VOTES_TO_SHOW.

import { storeEnabled } from "@/lib/payments/store";
import { MIN_VOTES_TO_SHOW } from "./major-wars";

export const votesEnabled = storeEnabled;
export class VoteStoreError extends Error {}

async function call(path: string, init: RequestInit & { prefer?: string } = {}): Promise<{ total: number | null }> {
  const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let res: Response;
  try {
    res = await fetch(`${base}/rest/v1/major_votes${path}`, {
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
    throw new VoteStoreError("database unreachable");
  }
  if (res.status === 409) throw new VoteStoreError("duplicate");
  if (!res.ok) throw new VoteStoreError(`database answered ${res.status}`); // never include the body
  const range = res.headers.get("content-range"); // "0-0/42" or "*/0"
  return { total: range && /\/(\d+)$/.test(range) ? Number(range.split("/")[1]) : null };
}

export async function insertVote(row: { day: number; player_id: string; choice: 0 | 1 }): Promise<void> {
  await call("", { method: "POST", body: JSON.stringify(row), prefer: "return=minimal" });
}

/** Whole-number percentages [first, second] for a day, or null while fewer than MIN_VOTES_TO_SHOW people have voted. */
export async function split(day: number): Promise<[number, number] | null> {
  const count = async (choice: 0 | 1) =>
    (await call(`?select=id&day=eq.${day}&choice=eq.${choice}&limit=1`, { prefer: "count=exact" })).total ?? 0;
  const [a, b] = await Promise.all([count(0), count(1)]);
  const total = a + b;
  if (total < MIN_VOTES_TO_SHOW) return null;
  const first = Math.round((a / total) * 100);
  return [first, 100 - first];
}

/** Raw vote counts [first, second] for a day. For the owner's digest only: never sent to the browser. */
export async function counts(day: number): Promise<[number, number]> {
  const count = async (choice: 0 | 1) =>
    (await call(`?select=id&day=eq.${day}&choice=eq.${choice}&limit=1`, { prefer: "count=exact" })).total ?? 0;
  const [a, b] = await Promise.all([count(0), count(1)]);
  return [a, b];
}
