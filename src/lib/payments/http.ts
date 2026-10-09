import { NextRequest } from "next/server";
import { PAYMENTS_MODE } from "@/lib/premium";
import { crossSite } from "@/lib/same-origin";
import { clientIp, rateLimited } from "@/lib/telegram";
import { gateAllows } from "./gate";

// Small helpers shared by the checkout and plan routes.

export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * The standard guards: payments must be on, anything that changes something must come from our own pages (not from
 * another website through a visitor's browser), the private gate (if there is one) must be open for this browser, and
 * the visitor must not be hammering the route. Reading (GET) is left open to links from anywhere, so a link to the PDF
 * keeps working; what it returns is still protected by the unlock cookie. Paystack's webhook deliberately does not use
 * this: it must always get through.
 */
export function guard(req: NextRequest, bucket: string, max: number): Response | null {
  if (PAYMENTS_MODE === "off") return json({ error: "not_available" }, 404);
  if (req.method !== "GET" && req.method !== "HEAD" && crossSite(req)) return json({ error: "forbidden" }, 403);
  if (!gateAllows(req)) return json({ error: "not_available" }, 404);
  if (rateLimited(`${bucket}:${clientIp(req)}`, max, 60 * 60 * 1000)) return json({ error: "too_many_requests" }, 429);
  return null;
}

/** Reads a small JSON body. Returns null when it is missing, too big or not an object. */
export async function readBody(req: NextRequest, maxBytes = 2048): Promise<Record<string, unknown> | null> {
  try {
    if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return null; // refuse before reading it
    const text = await req.text();
    if (text.length > maxBytes) return null;
    const body = JSON.parse(text);
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
