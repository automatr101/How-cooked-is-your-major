import { NextRequest } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { findMajor } from "@/lib/payments";
import { mayRead } from "@/lib/payments/access";
import { guard, json } from "@/lib/payments/http";
import { buildPlan } from "@/lib/plan/generate";
import { PlanPdf } from "@/lib/pdf/plan-pdf";

// The PDF copy of the paid report. Same rule as the web report: only a browser whose signed unlock cookie
// (set by /api/checkout/verify after the provider confirmed the payment, test-mode payments included) covers
// this major gets a file. Anyone else gets 403 and nothing is generated. The PDF is drawn from the same plan
// object as the web page, so the two always match, and nothing is stored: it is built on request.

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const blocked = guard(req, "plan-pdf", 30);
  if (blocked) return blocked;

  const major = findMajor(req.nextUrl.searchParams.get("major"));
  if (!major) return json({ error: "unknown_major" }, 400);
  if (!(await mayRead(req, major.slug))) return json({ error: "payment_required" }, 403);

  const plan = buildPlan(major);
  const document = <PlanPdf plan={plan} />; // built outside the try: a layout error surfaces from renderToBuffer below
  try {
    const pdf = await renderToBuffer(document);
    const filename = `MajorLabs-${major.slug}-${plan.planType.replace(/_/g, "-")}.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    console.error("[pdf] could not generate the PDF"); // no details: keep the log free of anything about the buyer
    return json({ error: "pdf_failed" }, 500);
  }
}
