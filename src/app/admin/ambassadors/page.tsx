import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ADMIN_COOKIE_NAME, adminEnabled, validAdminCookie } from "@/lib/reviews/admin";
import { ambassadorsEnabled, COMMISSION_PERCENT, HOLD_DAYS, listForAdmin, money, type Totals } from "@/lib/ambassadors/store";

// The owner's ambassador admin: who signed up, their visits and sales, and what you owe each one. Pay them yourself (mobile
// money or bank), then press "Mark paid out". Same admin key and cookie as the reviews admin; closed (404) without the key.

export const metadata: Metadata = { title: "Ambassadors admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-border bg-card p-4 text-sm";
const button = "rounded-full border border-border px-4 py-2 text-xs font-black uppercase tracking-widest transition hover:bg-muted";

function sumOf(t: Totals, field: "earned" | "pending" | "owed" | "paidOut"): string {
  const parts = Object.entries(t.money).filter(([, m]) => m[field] > 0).map(([cur, m]) => money(m[field], cur));
  return parts.length ? parts.join(" + ") : "0";
}

export default async function AmbassadorsAdminPage() {
  if (!adminEnabled()) notFound();
  const jar = await cookies();
  if (!validAdminCookie(jar.get(ADMIN_COOKIE_NAME)?.value)) {
    return (
      <main className="mx-auto max-w-sm px-4 py-24">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Ambassadors admin</h1>
        <form method="post" action="/api/admin/login" className="mt-6 space-y-3">
          <input type="hidden" name="next" value="/admin/ambassadors" />
          <label htmlFor="key" className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Admin key</label>
          <input id="key" name="key" type="password" autoComplete="current-password" required className="w-full rounded-2xl border border-border bg-background px-4 py-3 text-base" />
          <button type="submit" className="w-full rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground">Open</button>
        </form>
      </main>
    );
  }
  if (!ambassadorsEnabled()) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-24">
        <h1 className="text-2xl font-black uppercase tracking-tighter">Ambassadors admin</h1>
        <p className="mt-4 text-sm text-muted-foreground">The database is not set up, so there is nothing to show.</p>
      </main>
    );
  }

  let rows: Awaited<ReturnType<typeof listForAdmin>> = [];
  let failed = false;
  try {
    rows = await listForAdmin();
  } catch {
    failed = true;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-black uppercase tracking-tighter">Ambassadors admin</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {rows.length} ambassadors. Commission {COMMISSION_PERCENT}% of what each buyer paid. A sale is payable {HOLD_DAYS} days after it (refund window).
        Refunded sales are left out automatically.
      </p>
      {failed && <p role="alert" className="mt-4 text-sm font-bold text-destructive">Could not load. Are the ambassadors and referrals tables created (db/ambassadors.sql)?</p>}
      <ul className="mt-6 space-y-3">
        {rows.map((a) => (
          <li key={a.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-black">
                {a.name} <span className="font-normal text-muted-foreground">· {a.campus}</span>
                {a.status === "paused" && <span className="ml-2 text-destructive">PAUSED</span>}
              </p>
              <p className="font-mono text-xs text-muted-foreground">{a.code}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {a.email} · joined {new Date(a.created_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}
            </p>
            <p className="mt-2">
              {a.totals.clicks} visits · {a.totals.started} checkouts · {a.totals.sales} sales · {a.totals.refunded} refunded
            </p>
            <p className="mt-1">
              Owed now: <b className="text-primary">{sumOf(a.totals, "owed")}</b> · pending {sumOf(a.totals, "pending")} · paid out {sumOf(a.totals, "paidOut")}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form method="post" action="/api/admin/ambassadors">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="action" value="paid_out" />
                <button type="submit" className={button}>I paid what is owed</button>
              </form>
              <form method="post" action="/api/admin/ambassadors">
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="action" value={a.status === "paused" ? "activate" : "pause"} />
                <button type="submit" className={button}>{a.status === "paused" ? "Re-activate link" : "Pause link"}</button>
              </form>
            </div>
          </li>
        ))}
        {!rows.length && !failed && <li className="text-sm text-muted-foreground">No ambassadors yet.</li>}
      </ul>
    </main>
  );
}
