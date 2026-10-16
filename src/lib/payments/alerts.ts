import { after } from "next/server";
import { PAYMENTS_MODE, PLAN_COPY, planTypeFor } from "@/lib/premium";
import { escapeHtml, rateLimited, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { gateActive } from "./gate";
import { activeCharge } from "./paystack";

// SERVER ONLY. Telegram alerts for the steps BEFORE a purchase, so you can see how far people get:
//
//   paywall viewed -> unlock clicked -> checkout opened -> payment started -> (payment not completed | could not start)
//   plus "checkout problem on the visitor's side" (a stuck redirect, a network error, a plan that would not load)
//
// The purchase itself is announced by purchases.ts, and refunds by the webhook. Nothing here ever carries an email
// address or an IP address: only the major, the plan, the amount, and the visitor's country, device and browser.
// Messages are sent after the response has gone out, so Telegram being slow can never slow a checkout down.
//
//   TELEGRAM_PAYMENT_ALERTS=off   mutes all of these step alerts (purchase and refund alerts are not affected)
//   TELEGRAM_PAYWALL_VIEWS=off    mutes only "Paywall viewed" (the noisiest one), keeping the rest

export type FunnelStep = "viewed" | "unlock" | "opened" | "started" | "not_started" | "not_completed" | "client_error";

const HEADLINE: Record<FunnelStep, string> = {
  viewed: "👀 <b>Paywall viewed</b>",
  unlock: "🔓 <b>Unlock clicked</b>",
  opened: "🧾 <b>Checkout opened</b>",
  started: "💳 <b>Payment started</b> (sent to Paystack)",
  not_started: "⚠️ <b>Payment could not start</b>",
  not_completed: "❌ <b>Payment not completed</b>",
  client_error: "🚧 <b>Checkout problem on the visitor's side</b>",
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
  if (step === "viewed" && process.env.TELEGRAM_PAYWALL_VIEWS === "off") return;
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
      const paid = activeCharge();
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
