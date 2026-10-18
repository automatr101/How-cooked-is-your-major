import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { dueLeads, leadsEnabled, markAlerted, markSent, scoreAlertLeads, type Day, type LeadRow } from "@/lib/leads/store";
import { emailEnabled, sendEmail } from "@/lib/leads/email";
import { EMAILS, scoreChange } from "@/lib/leads/content";
import { majorBySlug } from "@/lib/leads/majors";
import { SITE_URL } from "@/lib/site";

// Run once a day by Vercel Cron (vercel.json). Sends the Day 1 and Day 2 emails (and a Day 0 catch-up for signups from the
// last 48 hours that were not mailed because sending was off). Vercel sends "Authorization: Bearer <CRON_SECRET>"; without
// CRON_SECRET set this route does nothing, so nobody else can trigger sends.

export const runtime = "nodejs";
export const maxDuration = 60;

const PER_DAY_LIMIT = 40;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

async function sendDay(day: Day, lead: LeadRow): Promise<boolean> {
  const major = majorBySlug(lead.major_slug);
  if (!major) return false;
  const unsubscribeUrl = `${SITE_URL}/unsubscribe?t=${lead.unsubscribe_token}`;
  const ok = await sendEmail({ to: lead.email, ...EMAILS[day](major, unsubscribeUrl), unsubscribeUrl });
  if (ok) await markSent(lead.id, day);
  return ok;
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return new Response(null, { status: 401 });
  if (!leadsEnabled() || !emailEnabled()) return Response.json({ skipped: "email sending or the database is not set up" });

  const sent = { day0: 0, day1: 0, day2: 0 };
  let failed = 0;
  for (const day of [0, 1, 2] as const) {
    let due: LeadRow[] = [];
    try {
      due = await dueLeads(day, PER_DAY_LIMIT);
    } catch {
      console.error("[cron] could not list due leads");
      failed++;
      continue;
    }
    for (const lead of due) {
      try {
        if (await sendDay(day, lead)) sent[`day${day}` as keyof typeof sent]++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }
  // Score-change alerts (separate opt-in): a lead whose major's score is no longer the one we last told them gets one email
  let scoreChanges = 0;
  try {
    for (const lead of await scoreAlertLeads()) {
      if (scoreChanges >= PER_DAY_LIMIT) break;
      const major = majorBySlug(lead.major_slug);
      const told = lead.alerted_score ?? lead.score;
      if (!major || major.score === told) continue;
      try {
        const unsubscribeUrl = `${SITE_URL}/unsubscribe?t=${lead.unsubscribe_token}`;
        if (await sendEmail({ to: lead.email, ...scoreChange(major, told, unsubscribeUrl), unsubscribeUrl })) {
          await markAlerted(lead.id, major.score);
          scoreChanges++;
        } else failed++;
      } catch {
        failed++;
      }
    }
  } catch {
    console.error("[cron] could not list score-alert leads");
    failed++;
  }
  return Response.json({ sent: { ...sent, scoreChanges }, failed });
}
