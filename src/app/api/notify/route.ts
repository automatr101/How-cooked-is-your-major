import { NextRequest } from "next/server";
import { majors } from "@/lib/data";

// Telegram visit/scan alerts. Silently does nothing until TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID are set, so the site works the same without them.
//
//   TELEGRAM_NOTIFY_MODE   "scans" (default) alerts on scans only, "all" also alerts on visits
//   TELEGRAM_NOTIFY_DEV    set to "1" to allow alerts outside production
//   TELEGRAM_API_BASE      override for testing against a fake Telegram server

const MAX_BODY_BYTES = 1024;
const MAX_PER_MINUTE = 6; // per visitor
const WINDOW_MS = 60_000;

// Best-effort limiter: memory is per serverless instance, so it blunts casual spam
// but is not a hard global cap.
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > MAX_PER_MINUTE;
}

const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|node-fetch|axios|go-http/i;

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function flag(country: string | null): string {
  if (!country || !/^[A-Za-z]{2}$/.test(country)) return "🌍 Unknown";
  const code = country.toUpperCase();
  const emoji = [...code].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join("");
  return `${emoji} ${code}`;
}

function browser(ua: string): string {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/chrome|crios/i.test(ua)) return "Chrome";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

// Hostname only: never forward full referrer URLs, which can carry query strings.
function referrerHost(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "direct";
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host.slice(0, 60) || "direct";
  } catch {
    return "direct";
  }
}

export async function POST(req: NextRequest) {
  const done = () => new Response(null, { status: 204 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return done();
  if (process.env.NODE_ENV !== "production" && process.env.TELEGRAM_NOTIFY_DEV !== "1") return done();

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return done();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  if (rateLimited(ip)) return new Response(null, { status: 429 });

  const length = Number(req.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) return new Response(null, { status: 413 });

  let body: unknown;
  try {
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) return new Response(null, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return new Response(null, { status: 400 });
  }
  if (typeof body !== "object" || body === null) return new Response(null, { status: 400 });
  const { type, major: majorName, referrer } = body as Record<string, unknown>;

  const mode = process.env.TELEGRAM_NOTIFY_MODE === "all" ? "all" : "scans";
  const who = `${flag(req.headers.get("x-vercel-ip-country"))} · ${/mobile|android|iphone|ipad/i.test(ua) ? "📱 Mobile" : "💻 Desktop"} · ${browser(ua)}`;
  const from = `↩️ from ${escapeHtml(referrerHost(referrer))}`;

  let text: string;
  if (type === "visit") {
    if (mode !== "all") return done();
    text = `👀 <b>New visit</b>\n${who}\n${from}`;
  } else if (type === "scan") {
    // Look the major up server-side so only real names and scores can ever be posted.
    const found = typeof majorName === "string" ? majors.find((m) => m.name === majorName) : undefined;
    if (!found) return new Response(null, { status: 400 });
    text = `🔥 <b>Scan:</b> ${escapeHtml(found.name)} — ${found.score}% (${escapeHtml(found.level)})\n${who}\n${from}`;
  } else {
    return new Response(null, { status: 400 });
  }

  try {
    const base = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";
    const res = await fetch(`${base}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(4000),
    });
    // Log the status only: the request URL contains the bot token.
    if (!res.ok) console.error(`[notify] Telegram responded ${res.status}`);
  } catch {
    console.error("[notify] Telegram request failed");
  }
  return done();
}
