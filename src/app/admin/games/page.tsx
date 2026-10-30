import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE_NAME, adminEnabled, validAdminCookie } from "@/lib/reviews/admin";
import { listRecent, scoresEnabled, type AdminEntry } from "@/lib/games/scores";

// The owner's games admin: recent leaderboard entries with a Remove button for bad nicknames.
// Closed (404) unless REVIEWS_ADMIN_KEY is set, same as the reviews admin.

export const metadata: Metadata = { title: "Games admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const GAME_NAME = { wordle: "Major Wordle", "cooked-or-cap": "Cooked or Cap?" } as const;
const button = "rounded-full border border-border px-4 py-2 text-xs font-black uppercase tracking-widest transition hover:bg-muted";

export default async function GamesAdminPage() {
  if (!adminEnabled()) notFound();
  const jar = await cookies();

  if (!validAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Games admin</h1>
        <form method="post" action="/api/admin/login" className="mt-6 space-y-3">
          <input type="hidden" name="next" value="/admin/games" />
          <label htmlFor="key" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Admin key</label>
          <input id="key" name="key" type="password" autoComplete="current-password" required className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base" />
          <button type="submit" className="w-full rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground">Open</button>
        </form>
      </main>
    );
  }

  let rows: AdminEntry[] = [];
  let failed = false;
  if (scoresEnabled()) {
    try {
      rows = await listRecent(7);
    } catch {
      failed = true;
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-black uppercase tracking-tighter">Games admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Leaderboard entries from the last 7 days, newest first ({rows.length}). Remove deletes the entry; that player can post again that day under another name.
      </p>
      {!scoresEnabled() && <p className="mt-4 text-sm text-muted-foreground">The database is not set up (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY).</p>}
      {failed && <p role="alert" className="mt-4 text-sm font-bold text-destructive">Could not load the entries. Is the game_scores table created?</p>}

      <ul className="mt-8 space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
            <div>
              <p className="font-black">{r.nickname}</p>
              <p className="text-xs text-muted-foreground">
                {GAME_NAME[r.game]} · #{r.day} · score {r.score} · {new Date(r.created_at).toLocaleString("en-GB", { timeZone: "UTC" })} UTC
              </p>
            </div>
            <form method="post" action="/api/admin/games">
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" className={button}>Remove</button>
            </form>
          </li>
        ))}
        {rows.length === 0 && !failed && <li className="text-sm text-muted-foreground">No entries yet.</li>}
      </ul>
    </main>
  );
}
