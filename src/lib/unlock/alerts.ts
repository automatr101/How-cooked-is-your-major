import { after } from "next/server";
import { escapeHtml, sendTelegram, telegramEnabled, visitorLine } from "@/lib/telegram";
import { gateActive } from "@/lib/payments/gate";

// SERVER ONLY. Private Telegram alerts for the paid-unlock experiment (the purchase itself is announced by purchases.ts).
// Never an email or an IP: the result, the amount, and the visitor's country, device and browser. Muted with the other payment
// step alerts by TELEGRAM_PAYMENT_ALERTS=off. Sent after the response, so a slow Telegram never slows a payment down.

export function unlockAlert(req: Request, headline: string, major: { name: string; score: number }, extra: string[] = []): void {
  if (!telegramEnabled() || process.env.TELEGRAM_PAYMENT_ALERTS === "off") return;
  const lines = [headline, `📚 ${escapeHtml(major.name)} (${major.score}%)`, ...extra.map(escapeHtml), visitorLine(req)];
  if (gateActive()) lines.push("🔒 private test");
  const text = lines.join("\n");
  try {
    after(() => sendTelegram(text));
  } catch {
    void sendTelegram(text);
  }
}
