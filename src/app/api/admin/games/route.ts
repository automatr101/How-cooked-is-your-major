import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, validAdminCookie } from "@/lib/reviews/admin";
import { crossSite } from "@/lib/same-origin";
import { deleteScore } from "@/lib/games/scores";

// Removes one leaderboard entry. Needs the admin cookie; refuses requests made by other websites.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export async function POST(req: NextRequest) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (crossSite(req) || !validAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) return notFound();

  let id = "";
  try {
    id = String((await req.formData()).get("id") ?? "");
  } catch {
    return notFound();
  }
  if (!UUID.test(id)) return new Response("Bad request", { status: 400 });

  try {
    await deleteScore(id);
  } catch {
    return new Response("Could not remove", { status: 502 });
  }
  return NextResponse.redirect(new URL("/admin/games", req.url), 303);
}
