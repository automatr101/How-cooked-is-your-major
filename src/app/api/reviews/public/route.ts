import { NextRequest } from "next/server";
import { majors } from "@/lib/data";
import { slugify } from "@/lib/analytics";
import { EMPTY_PUBLIC, publicReviews } from "@/lib/reviews/store";

// What the public may see: counts, averages (only once there are enough ratings), and the approved quotes whose authors
// agreed to be shown. Everything comes from the reviews table; with no table, or no rows, the answer is all zeros and
// the page shows nothing. Safe for the host's cache to keep for a minute (browsers always revalidate): it carries no personal data beyond what was agreed to be shown.

const nameBySlug = new Map(majors.map((m) => [slugify(m.name), m.name]));

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("major");
  const slug = raw && /^[a-z0-9-]{1,120}$/.test(raw) ? raw : null;
  try {
    const data = await publicReviews(slug, (s) => nameBySlug.get(s) ?? null);
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300" } });
  } catch {
    console.error("[reviews] could not read reviews");
    return Response.json(EMPTY_PUBLIC, { headers: { "Cache-Control": "no-store" } });
  }
}
