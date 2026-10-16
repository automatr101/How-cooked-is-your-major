import { NextRequest } from "next/server";
import { findMajor } from "@/lib/payments";
import { funnelAlert, type FunnelStep } from "@/lib/payments/alerts";
import { guard, json, readBody } from "@/lib/payments/http";
import { BOT_UA, clientIp, rateLimited } from "@/lib/telegram";

// The steps only the browser can see ("viewed the paywall", "clicked Unlock", "opened the checkout", "the redirect
// got stuck") reach Telegram through here; the later steps are seen by the server itself. The body carries only an event
// name from a fixed list, the major's name (looked up here, so nothing but real majors can ever be announced) and, for a
// problem, a reason from a fixed list. No free text from the browser ever reaches the message.
// Same guards as every payment route: payments on, private gate open, no hammering.

const WINDOW_MS = 10 * 60 * 1000;

const EVENTS: Record<string, FunnelStep> = {
  paywall_viewed: "viewed",
  unlock_clicked: "unlock",
  checkout_opened: "opened",
  checkout_problem: "client_error",
};

const REASONS: Record<string, string> = {
  redirect_stuck: "The payment page did not open (in-app browser or popup blocked). The visitor was offered a manual link.",
  could_not_start: "The checkout could not be started.",
  network: "Network problem while paying.",
  plan_load_failed: "Payment confirmed, but the plan did not load.",
  confirmation_pending: "Payment not confirmed yet after several checks.",
};

export async function POST(req: NextRequest) {
  const blocked = guard(req, "checkout-event", 60);
  if (blocked) return blocked;

  const body = await readBody(req, 512);
  const major = findMajor(body?.major);
  const step = typeof body?.event === "string" ? EVENTS[body.event] : undefined;
  if (!step || !major) return json({ error: "bad_request" }, 400);

  const reason = typeof body?.reason === "string" ? REASONS[body.reason] : undefined;
  if (step === "client_error" && !reason) return json({ error: "bad_request" }, 400);

  const ua = req.headers.get("user-agent") ?? "";
  // The same visitor repeating the same step for the same major within ten minutes is one alert, not several
  const key = `ev:${step}:${reason ?? ""}:${clientIp(req)}:${major.slug}`;
  if (ua && !BOT_UA.test(ua) && !rateLimited(key, 1, WINDOW_MS)) {
    funnelAlert(req, step, major, reason ? [reason] : []);
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
