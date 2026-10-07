import { after } from "next/server";
import { PAYMENTS_MODE, PLAN_COPY, planTypeFor } from "@/lib/premium";
import { escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { gateActive } from "./gate";
import { charge } from "./paystack";

// SERVER ONLY. Telegram alerts for the steps BEFORE a purchase, so you can see how far people get:
//
//   unlock clicked  ->  payment started  ->  (payment not completed | payment could not start)
//
// The purchase itself is announced by purchases.ts, and refunds by the webhook. Nothing here ever carries an email
// address or an IP address: only the major, the plan, the amount, and the visitor's country, device and browser.
// Messages are sent after the response has gone out, so Telegram being slow can never slow a checkout down.
//
//   TELEGRAM_PAYMENT_ALERTS=off   mutes these step alerts (purchase and refund alerts are not affected)

export type FunnelStep = "unlock" | "started" | "not_started" | "not_completed";

const HEADLINE: Record<FunnelStep, string> = {
  unlock: "🔓 <b>Unlock clicked</b>",
  started: "💳 <b>Payment started</b> (sent to Paystack)",
  not_started: "⚠️ <b>Payment could not start</b>",
  not_completed: "❌ <b>Payment not completed</b>",
};

const sent = new Set<string>(); // per server instance, best effort: stops the same outcome being announced twice

/** Tells test runs apart from real traffic at a glance. */
function modeNote(): string | null {
  const notes: string[] = [];
  if (gateActive()) notes.push("🔒 private test");
  if (process.env.PAYSTACK_SECRET_KEY?.trim().startsWith("sk_test_")) notes.push("🧪 test key");
  return notes.length ? notes.join(" · ") : null;
}

/**
 * Queues one funnel alert. `extra` lines are plain text (escaped here). `onceKey` makes a repeated outcome
 * (e.g. the same failed payment checked twice) announce only once.
 */
export function funnelAlert(
  req: Request,
  step: FunnelStep,
  major: { name: string; score: number },
  extra: string[] = [],
  onceKey?: string
): void {
  if (!telegramEnabled() || process.env.TELEGRAM_PAYMENT_ALERTS === "off") return;
  // A broken setting would otherwise alert on every attempt: at most five of these per ten minutes
  if (step === "not_started" && rateLimited("funnel:not_started", 5, 10 * 60 * 1000)) return;
  if (onceKey) {
    if (sent.has(onceKey)) return;
    if (sent.size > 2000) sent.clear();
    sent.add(onceKey);
  }

  const lines = [HEADLINE[step], `📚 ${escapeHtml(major.name)} (${major.score}%) · ${escapeHtml(PLAN_COPY[planTypeFor(major.score)].name)}`];
  if (step === "started" && PAYMENTS_MODE === "live") {
    try {
      const paid = charge();
      lines.push(`💵 ${(paid.amount / 100).toFixed(2)} ${paid.currency}`);
    } catch {
      // a bad price setting is reported by the "could not start" alert, not here
    }
  }
  for (const line of extra) lines.push(escapeHtml(line));
  lines.push(visitorLine(req));
  const note = modeNote();
  if (note) lines.push(note);

  const text = lines.join("\n");
  try {
    after(() => sendTelegram(text));
  } catch {
    void sendTelegram(text); // not inside a request: send straight away
  }
}
