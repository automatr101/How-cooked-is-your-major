import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, validAdminCookie } from "@/lib/reviews/admin";
import { crossSite } from "@/lib/same-origin";
import { setStatus, type ReviewStatus } from "@/lib/reviews/store";

// Approve or hide one review. Needs the admin cookie; refuses requests made by other websites.

const STATUSES: ReviewStatus[] = ["pending", "approved", "hidden"];

export async function POST(req: NextRequest) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (crossSite(req) || !validAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) return notFound();

  let id = "";
  let status = "";
  try {
    const form = await req.formData();
    id = String(form.get("id") ?? "");
    status = String(form.get("status") ?? "");
  } catch {
    return notFound();
  }
  if (!STATUSES.includes(status as ReviewStatus)) return new Response("Bad request", { status: 400 });

  try {
    await setStatus(id, status as ReviewStatus);
  } catch {
    return new Response("Could not update", { status: 502 });
  }
  return NextResponse.redirect(new URL("/admin/reviews", req.url), 303);
}
