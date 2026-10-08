import { NextRequest, NextResponse } from "next/server";
import { gateActive, gateCookie, keyMatches } from "@/lib/payments/gate";
import { clientIp, rateLimited } from "@/lib/telegram";

// Opens the private payments gate for this browser. Visit  /api/preview?key=<PAYMENTS_PREVIEW_KEY>  once.
// A wrong key, or no gate configured, looks exactly like a page that does not exist. Attempts are limited.

export async function GET(req: NextRequest) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!gateActive()) return notFound();
  if (rateLimited(`preview:${clientIp(req)}`, 8, 10 * 60 * 1000)) return notFound();
  if (!keyMatches(req.nextUrl.searchParams.get("key") ?? "")) return notFound();

  const cookie = gateCookie();
  // cm_internal=1 also tells the analytics tag that this browser is the owner's, so test visits stay out of GA4
  const res = NextResponse.redirect(new URL("/?cm_internal=1", req.url));
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookie.maxAge,
  });
  res.headers.set("Referrer-Policy", "no-referrer"); // the key is in this address: do not pass it on
  res.headers.set("Cache-Control", "no-store");
  return res;
}
