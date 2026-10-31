import { timingSafeEqual } from "node:crypto";
import { NextRequest } from "next/server";
import { buildDigest } from "@/lib/games/digest";
import { currentDay } from "@/lib/games/scores";
import { sendTelegram, telegramEnabled } from "@/lib/telegram";

// Run once a day, just after midnight UTC, by Vercel Cron (vercel.json): sends yesterday's games digest to the owner's Telegram.
// Vercel sends "Authorization: Bearer <CRON_SECRET>"; without CRON_SECRET set this route does nothing, so nobody else can trigger it.

export const runtime = "nodejs";
export const maxDuration = 30;

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return new Response(null, { status: 401 });
  if (!telegramEnabled()) return Response.json({ skipped: "Telegram is not set up" });
  const day = currentDay() - 1; // the puzzle day that just ended
  if (day < 1) return Response.json({ skipped: "no finished day yet" });
  await sendTelegram(await buildDigest(day));
  return Response.json({ sent: day });
}
