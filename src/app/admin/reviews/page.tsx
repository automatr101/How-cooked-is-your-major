import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { majors } from "@/lib/data";
import { slugify } from "@/lib/analytics";
import { ADMIN_COOKIE_NAME, adminEnabled, validAdminCookie } from "@/lib/reviews/admin";
import { listForAdmin, MIN_RATINGS_FOR_AVERAGE, reviewsEnabled, type ReviewRow, type ReviewStatus } from "@/lib/reviews/store";

// The owner's review admin: every real submission, with Approve and Hide. Nothing public until a review is approved
// (thumbs count right away; stars and written reviews wait here). Closed (404) unless REVIEWS_ADMIN_KEY is set.

export const metadata: Metadata = { title: "Reviews admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const nameBySlug = new Map(majors.map((m) => [slugify(m.name), m.name]));

const card = "rounded-2xl border border-border bg-card p-4 text-sm";
const button = "rounded-full border border-border px-4 py-2 text-xs font-black uppercase tracking-widest transition hover:bg-muted";

export default async function ReviewsAdminPage() {
  if (!adminEnabled()) notFound();
  const jar = await cookies();
  const signedIn = validAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value);

  if (!signedIn) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Reviews admin</h1>
        <form method="post" action="/api/admin/login" className="mt-6 space-y-3">
          <label htmlFor="key" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Admin key</label>
          <input id="key" name="key" type="password" autoComplete="current-password" required className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base" />
          <button type="submit" className="w-full rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground">Open</button>
        </form>
      </main>
    );
  }

  if (!reviewsEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Reviews admin</h1>
        <p className="mt-4 text-sm text-muted-foreground">The database is not set up (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY), so there is nothing to show.</p>
      </main>
    );
  }

  let rows: ReviewRow[] = [];
  let failed = false;
  try {
    rows = await listForAdmin();
  } catch {
    failed = true;
  }

  const by = (s: ReviewStatus) => rows.filter((r) => r.status === s);
  const ratings = rows.filter((r) => r.status === "approved" && r.rating != null).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-black uppercase tracking-tighter">Reviews admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {rows.length} submissions. {by("pending").length} waiting, {by("approved").length} approved, {by("hidden").length} hidden. The site shows an average only once
        there are {MIN_RATINGS_FOR_AVERAGE} approved ratings of a kind; right now {ratings} approved {ratings === 1 ? "rating" : "ratings"} in total.
      </p>
      {failed && <p role="alert" className="mt-4 text-sm font-bold text-destructive">Could not load the reviews. Is the reviews table created?</p>}

      {(["pending", "approved", "hidden"] as const).map((status) => (
        <section key={status} className="mt-10">
          <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">
            {status === "pending" ? "Waiting for approval" : status === "approved" ? "Approved (public)" : "Hidden"} ({by(status).length})
          </h2>
          <ul className="mt-3 space-y-3">
            {by(status).map((r) => (
              <li key={r.id} className={card}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-black">
                    {r.kind === "verified_purchase" ? "Verified purchase" : "Free scan feedback"}
                    {r.rating != null && <span className="ml-2 text-amber-400">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>}
                    {r.accurate != null && <span className="ml-2">{r.accurate ? "👍 accurate" : "👎 not accurate"}</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC</p>
                </div>
                {r.major_slug && <p className="mt-1 text-xs text-muted-foreground">Major: {nameBySlug.get(r.major_slug) ?? r.major_slug}</p>}
                {r.comment && <p className="mt-2 leading-relaxed">“{r.comment}”</p>}
                <p className="mt-2 text-xs text-muted-foreground">
                  {r.consent_display ? `Agreed to be shown as ${r.display_name ?? "?"}${r.country ? `, ${r.country}` : ""}` : "Did not agree to be shown by name (counts in the totals only)"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(["approved", "hidden", "pending"] as const)
                    .filter((s) => s !== r.status)
                    .map((s) => (
                      <form key={s} method="post" action="/api/admin/reviews">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="status" value={s} />
                        <button type="submit" className={button}>
                          {s === "approved" ? "Approve" : s === "hidden" ? "Hide" : "Back to waiting"}
                        </button>
                      </form>
                    ))}
                </div>
              </li>
            ))}
            {by(status).length === 0 && <li className="text-sm text-muted-foreground">None.</li>}
          </ul>
        </section>
      ))}
    </main>
  );
}
