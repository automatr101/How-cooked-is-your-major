import { NextRequest, NextResponse } from "next/server";
import { adminCookie, adminEnabled, keyMatches } from "@/lib/reviews/admin";
import { crossSite } from "@/lib/same-origin";
import { clientIp, rateLimited } from "@/lib/telegram";

// Opens the review admin for this browser. The key arrives in a form body, never in the address. A wrong key, a closed
// admin, or too many tries all look the same: a 404.

export async function POST(req: NextRequest) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (!adminEnabled() || crossSite(req)) return notFound();
  if (rateLimited(`admin-login:${clientIp(req)}`, 8, 10 * 60 * 1000)) return notFound();

  let key = "";
  try {
    const form = await req.formData();
    key = String(form.get("key") ?? "").slice(0, 200);
  } catch {
    return notFound();
  }
  if (!keyMatches(key)) return notFound();

  const cookie = adminCookie();
  const res = NextResponse.redirect(new URL("/admin/reviews", req.url), 303);
  res.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: cookie.maxAge,
  });
  res.headers.set("Cache-Control", "no-store");
  return res;
}
