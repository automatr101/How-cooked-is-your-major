import { NextRequest } from "next/server";
import { clientIp, rateLimited } from "@/lib/telegram";
import { leadsEnabled, unsubscribe } from "@/lib/leads/store";

// Unsubscribe by the secret token in each email's link. POST only, so an email scanner that merely opens the link does not
// unsubscribe anyone (the /unsubscribe page shows a button). Mail apps' one-click "Unsubscribe" also POSTs here.
// The answer is the same whether or not the token matched, so it cannot be used to find out which tokens exist.

export async function POST(req: NextRequest) {
  if (!leadsEnabled()) return new Response(null, { status: 503 });
  if (rateLimited(`unsub:${clientIp(req)}`, 30, 60 * 60 * 1000)) return new Response(null, { status: 429 });
  let token = new URL(req.url).searchParams.get("t") ?? "";
  if (!token) {
    try {
      const text = await req.text();
      token = text.length < 400 ? (new URLSearchParams(text).get("t") ?? (JSON.parse(text) as { t?: string }).t ?? "") : "";
    } catch {
      token = "";
    }
  }
  try {
    await unsubscribe(token);
  } catch {
    return new Response(null, { status: 502 });
  }
  return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
