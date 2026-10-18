import { NextRequest } from "next/server";
import { EMAIL_PATTERN } from "@/lib/payments";
import { storeEnabled } from "@/lib/payments/store";
import { crossSite } from "@/lib/same-origin";
import { cleanText } from "@/lib/clean-text";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";

// "We don't have that major yet": the visitor asks for it, optionally leaving an email to hear when it is added. It is the
// expansion list: stored in major_requests (db/major_requests.sql) and sent to Telegram. The site never makes up a score for
// a major it does not have. The email is only kept when typed in, and the alert never contains it.

const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (crossSite(req)) return reply({ error: "forbidden" }, 403);
  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return reply({ error: "bad_request" }, 400);
  if (rateLimited(`major-request:${clientIp(req)}`, 8, 60 * 60 * 1000)) return reply({ error: "too_many_requests" }, 429);

  let body: Record<string, unknown> = {};
  try {
    const text = await req.text();
    if (text.length > 600) return reply({ error: "too_big" }, 413);
    body = JSON.parse(text);
  } catch {
    return reply({ error: "bad_request" }, 400);
  }
  if (typeof body.hp === "string" && body.hp) return reply({ ok: true });
  const query = cleanText(body.query, 60);
  if (query.length < 2) return reply({ error: "bad_query" }, 400);
  const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (rawEmail && (rawEmail.length > 120 || !EMAIL_PATTERN.test(rawEmail))) return reply({ error: "invalid_email" }, 400);
  const country = req.headers.get("x-vercel-ip-country");

  if (storeEnabled()) {
    try {
      const base = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      const res = await fetch(`${base}/rest/v1/major_requests`, {
        method: "POST",
        headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({ query, email: rawEmail || null, country: country && /^[A-Za-z]{2}$/.test(country) ? country.toUpperCase() : null }),
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) console.error(`[major-request] database answered ${res.status}`);
    } catch {
      console.error("[major-request] database unreachable");
    }
  }
  if (telegramEnabled()) {
    const label = body.source === "link" ? "🔗 <b>Link to a missing major:</b>" : "🔎 <b>Missing major requested:</b>";
    await sendTelegram([`${label} ${escapeHtml(query)}`, rawEmail ? "📧 left an email to be told" : "", visitorLine(req)].filter(Boolean).join("\n")).catch(() => {});
  }
  return reply({ ok: true });
}
