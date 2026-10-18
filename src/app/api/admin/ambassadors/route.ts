import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, validAdminCookie } from "@/lib/reviews/admin";
import { crossSite } from "@/lib/same-origin";
import { markPaidOut, setAmbassadorStatus } from "@/lib/ambassadors/store";

// The owner's ambassador actions: mark what is owed as paid out, pause or re-activate a link. Needs the admin cookie;
// refuses requests made by other websites.

export async function POST(req: NextRequest) {
  const notFound = () => new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  if (crossSite(req) || !validAdminCookie(req.cookies.get(ADMIN_COOKIE_NAME)?.value)) return notFound();

  let id = "";
  let action = "";
  try {
    const form = await req.formData();
    id = String(form.get("id") ?? "");
    action = String(form.get("action") ?? "");
  } catch {
    return notFound();
  }

  try {
    if (action === "paid_out") await markPaidOut(id);
    else if (action === "pause" || action === "activate") await setAmbassadorStatus(id, action === "pause" ? "paused" : "active");
    else return new Response("Bad request", { status: 400 });
  } catch {
    return new Response("Could not update", { status: 502 });
  }
  return NextResponse.redirect(new URL("/admin/ambassadors", req.url), 303);
}
