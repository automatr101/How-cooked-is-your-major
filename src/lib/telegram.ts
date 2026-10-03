// Shared helpers for the Telegram-backed routes (/api/notify and /api/review).
// Server-side only: reads the bot token from the environment.
//
//   TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID   required; nothing is sent without both
//   TELEGRAM_NOTIFY_DEV                     set to "1" to allow sending outside production
//   TELEGRAM_API_BASE                       override for testing against a fake Telegram server

const LONGEST_WINDOW_MS = 60 * 60 * 1000;

// Best-effort limiter: memory is per serverless instance, so it blunts casual spam
// but is not a hard global cap.
const hits = new Map<string, number[]>();

export function rateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= LONGEST_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > max;
}

export const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python|node-fetch|axios|go-http/i;

export const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The IP is only ever used as an in-memory rate-limit key; it is never sent anywhere. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export function telegramEnabled(): boolean {
  if (!process.env.TELEGRAM_BOT_TOKEN || !process.env.TELEGRAM_CHAT_ID) return false;
  return process.env.NODE_ENV === "production" || process.env.TELEGRAM_NOTIFY_DEV === "1";
}

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

/** "🇬🇭 GH · 📱 Mobile · Chrome": country, device and browser only. */
export function visitorLine(req: Request): string {
  const ua = req.headers.get("user-agent") ?? "";
  const device = /mobile|android|iphone|ipad/i.test(ua) ? "📱 Mobile" : "💻 Desktop";
  return `${flag(req.headers.get("x-vercel-ip-country"))} · ${device} · ${browser(ua)}`;
}

export async function sendTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const base = process.env.TELEGRAM_API_BASE ?? "https://api.telegram.org";
    const res = await fetch(`${base}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
      signal: AbortSignal.timeout(4000),
    });
    // Log the status only: the request URL contains the bot token.
    if (!res.ok) console.error(`[telegram] Telegram responded ${res.status}`);
  } catch {
    console.error("[telegram] Telegram request failed");
  }
}
