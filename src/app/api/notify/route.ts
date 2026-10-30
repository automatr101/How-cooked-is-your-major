import { NextRequest } from "next/server";
import { majors } from "@/lib/data";
import { crossSite } from "@/lib/same-origin";
import { BOT_UA, clientIp, escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";

// Telegram visit/scan alerts. Silently does nothing until TELEGRAM_BOT_TOKEN and
// TELEGRAM_CHAT_ID are set, so the site works the same without them.
//
//   TELEGRAM_NOTIFY_MODE   "scans" (default) alerts on scans only, "all" also alerts on visits

const MAX_BODY_BYTES = 1024;
const MAX_PER_MINUTE = 6; // per visitor
const WINDOW_MS = 60_000;

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

// "Major Wordle #4 solved in 3/6". Null for anything that is not a known game with a result of the right shape.
function gameLine(game: unknown, result: unknown, day: unknown): string | null {
  const n = typeof day === "number" && Number.isInteger(day) && day > 0 && day < 100000 ? `#${day} ` : "";
  const r = typeof result === "string" ? result : "";
  if (game === "wordle" && /^([1-6]|fail)$/.test(r)) return `Major Wordle ${n}${r === "fail" ? "missed it" : `solved in ${r}/6`}`;
  if (game === "cooked-or-cap" && /^([0-9]|10)$/.test(r)) return `Cooked or Cap? ${n}scored ${r}/10`;
  if (game === "major-wars" && r === "vote") return `Major Wars ${n}vote cast`;
  if (game === "tic-tac-toe" && /^(win|loss|draw)-(easy|hard)$/.test(r)) {
    const [outcome, level] = r.split("-");
    return `Tic-Tac-Toe vs AI (${level}): ${outcome === "win" ? "player won" : outcome === "loss" ? "AI won" : "draw"}`;
  }
  return null;
}

export async function POST(req: NextRequest) {
  const done = () => new Response(null, { status: 204 });

  // Only our own pages report visits and scans: another website must not be able to fill the alert chat through a visitor.
  if (crossSite(req)) return new Response(null, { status: 403 });

  if (!telegramEnabled()) return done();

  const ua = req.headers.get("user-agent") ?? "";
  if (!ua || BOT_UA.test(ua)) return done();

  if (rateLimited(`notify:${clientIp(req)}`, MAX_PER_MINUTE, WINDOW_MS)) return new Response(null, { status: 429 });

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
  const { type, major: majorName, referrer, game, result, day } = body as Record<string, unknown>;

  const mode = process.env.TELEGRAM_NOTIFY_MODE === "all" ? "all" : "scans";
  const who = visitorLine(req);
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
  } else if (type === "game") {
    // Only known games and results of the right shape can ever be posted
    const line = gameLine(game, result, day);
    if (!line) return new Response(null, { status: 400 });
    text = `🎮 <b>${line}</b>\n${who}\n${from}`;
  } else {
    return new Response(null, { status: 400 });
  }

  await sendTelegram(text);
  return done();
}
