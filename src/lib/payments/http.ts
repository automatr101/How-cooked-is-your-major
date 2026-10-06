import { NextRequest } from "next/server";
import { PAYMENTS_MODE } from "@/lib/premium";
import { clientIp, rateLimited } from "@/lib/telegram";

// Small helpers shared by the checkout and plan routes.

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** The standard guards: payments must be on, and the visitor must not be hammering the route. */
export function guard(req: NextRequest, bucket: string, max: number): Response | null {
  if (PAYMENTS_MODE === "off") return json({ error: "not_available" }, 404);
  if (rateLimited(`${bucket}:${clientIp(req)}`, max, 60 * 60 * 1000)) return json({ error: "too_many_requests" }, 429);
  return null;
}

/** Reads a small JSON body. Returns null when it is missing, too big or not an object. */
export async function readBody(req: NextRequest, maxBytes = 2048): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
