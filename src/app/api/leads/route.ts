import { NextRequest } from "next/server";
import { EMAIL_PATTERN, findMajor } from "@/lib/payments";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { addLead, LeadStoreError, leadsEnabled, markSent } from "@/lib/leads/store";
import { emailEnabled, sendEmail } from "@/lib/leads/email";
import { day0, extendedRoast } from "@/lib/leads/content";
import { SITE_URL } from "@/lib/site";
import { experimentActiveFor, mayView } from "@/lib/unlock/access";

// "Get your extended roast + report sent to you": the visitor types an email and ticks the box that says they want 3 emails.
// The server stores the lead, sends the Day 0 email (when sending is on) and returns the extended roast to show on the page.
// The free result is untouched: only the EXTRA roast and numbers sit behind this.
//
// GET  -> { enabled }  whether the signup box should be shown at all (needs the database)
// POST -> { ok, extended }

const MAX_BODY_BYTES = 1024;
const MAX_PER_HOUR = 6;
const WINDOW_MS = 60 * 60 * 1000;

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET() {
  return reply({ enabled: leadsEnabled() });
}

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply({ error: "forbidden" }, 403);
  if (!leadsEnabled()) return reply({ error: "not_available" }, 503);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply({ error: "bad_request" }, 400);
  if (rateLimited(`lead:${clientIp(req)}`, MAX_PER_HOUR, WINDOW_MS)) return reply({ error: "too_many_requests" }, 429);

  let body: Record<string, unknown>;
  try {
    if (Number(req.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) return reply({ error: "too_big" }, 413);
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return reply({ error: "too_big" }, 413);
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reply({ error: "bad_request" }, 400);
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  if (typeof body.hp === "string" && body.hp.length > 0) return reply({ ok: true }); // a bot filled the hidden field: look like success

  const major = findMajor(body.major);
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!major) return reply({ error: "unknown_major" }, 400);
  // During the paid-unlock experiment the extended roast this answers with (it carries the score) is part of the locked result
  if (experimentActiveFor(req) && !(await mayView(req, major.slug))) return reply({ error: "locked" }, 402);
  if (email.length > 120 || !EMAIL_PATTERN.test(email)) return reply({ error: "invalid_email" }, 400);
  if (body.consent !== true) return reply({ error: "consent_required" }, 400); // the box must be ticked by the visitor
  const ref = typeof body.ref === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(body.ref) ? body.ref : null;
  const country = req.headers.get("x-vercel-ip-country");

  let lead;
  try {
    lead = await addLead({ email, major_slug: major.slug, score: major.score, ref, country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null, score_alerts: body.score_alerts === true });
  } catch (err) {
    console.error("[leads] could not save a lead", err instanceof LeadStoreError ? err.message : "");
    return reply({ error: "unavailable" }, 502);
  }

  const sending = emailEnabled();
  let emailed = false;
  if (lead && sending) {
    const unsubscribeUrl = `${SITE_URL}/unsubscribe?t=${lead.unsubscribe_token}`;
    const mail = day0(major, unsubscribeUrl);
    if (await sendEmail({ to: lead.email, ...mail, unsubscribeUrl })) {
      emailed = true;
      await markSent(lead.id, 0).catch(() => {});
    }
  }
  if (lead && telegramEnabled()) {
    // The owner follows up by hand while email sending is off, so the alert carries the address (the privacy policy says so)
    await sendTelegram(
      [`📧 <b>New lead</b>${sending ? "" : " (email sending is OFF, nothing was sent)"}`, `✉️ ${escapeHtml(lead.email)}`, `📚 ${escapeHtml(major.name)} (${major.score}%)${body.score_alerts === true ? " · 🔔 score alerts on" : ""}`, ref ? `🔗 ref: ${escapeHtml(ref)}` : "", visitorLine(req)].filter(Boolean).join("\n")
    );
  }
  return reply({ ok: true, emailed, extended: extendedRoast(major) });
}
