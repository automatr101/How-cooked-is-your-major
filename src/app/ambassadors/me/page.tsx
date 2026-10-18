import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ambassadorById, ambassadorsEnabled, COMMISSION_PERCENT, HOLD_DAYS, idFromToken, money, totalsFor, type Totals } from "@/lib/ambassadors/store";
import { SITE_URL } from "@/lib/site";

// An ambassador's private stats: /ambassadors/me?t=<signed token>. The token is the only key, so the page is never indexed,
// never cached, and answers 404 to anything else.

export const metadata: Metadata = { title: "Your ambassador stats", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const tile = "rounded-3xl border border-border bg-card p-5";
const label = "text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground";
const big = "mt-1 text-3xl font-black tracking-tighter";

function Money({ totals, field }: { totals: Totals; field: "earned" | "pending" | "owed" | "paidOut" }) {
  const entries = Object.entries(totals.money).filter(([, m]) => m[field] > 0);
  if (!entries.length) return <>0</>;
  return <>{entries.map(([cur, m]) => money(m[field], cur)).join(" + ")}</>;
}

export default async function AmbassadorStatsPage({ searchParams }: { searchParams: Promise<{ t?: string | string[] }> }) {
  if (!ambassadorsEnabled()) notFound();
  const { t } = await searchParams;
  const id = typeof t === "string" ? idFromToken(t) : null;
  if (!id) notFound();

  let amb, totals;
  try {
    amb = await ambassadorById(id);
    if (amb) totals = await totalsFor(amb);
  } catch {
    return (
      <main className="mx-auto max-w-2xl px-6 pb-24 pt-32">
        <p role="alert" className="text-sm font-bold">Could not load your stats right now. Try again in a minute.</p>
      </main>
    );
  }
  if (!amb || !totals) notFound();
  const link = `${SITE_URL}/?ref=${amb.code}`;

  return (
    <main className="min-h-screen bg-background px-6 pb-24 pt-32 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <p className={label}>Campus ambassador · {amb.campus}</p>
          <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter sm:text-5xl">Hey {amb.name.split(" ")[0]}.</h1>
          {amb.status === "paused" && (
            <p role="alert" className="rounded-2xl border border-destructive/40 p-4 text-sm font-bold text-destructive">
              Your link is paused, so new visits and sales are not counted. Message us through the contact page if you think that is a mistake.
            </p>
          )}
        </div>

        <div className={tile}>
          <p className={label}>Your link</p>
          <p className="mt-2 break-all font-mono text-sm font-bold">{link}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className={tile}><p className={label}>Visits</p><p className={big}>{totals.clicks}</p></div>
          <div className={tile}><p className={label}>Checkouts started</p><p className={big}>{totals.started}</p></div>
          <div className={tile}><p className={label}>Sales</p><p className={big}>{totals.sales}</p></div>
          <div className={tile}><p className={label}>Refunded</p><p className={big}>{totals.refunded}</p></div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className={tile}><p className={label}>Pending (refund window)</p><p className={big}><Money totals={totals} field="pending" /></p></div>
          <div className={`${tile} border-primary/40`}><p className={label}>Ready to be paid</p><p className={`${big} text-primary`}><Money totals={totals} field="owed" /></p></div>
          <div className={tile}><p className={label}>Paid out</p><p className={big}><Money totals={totals} field="paidOut" /></p></div>
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">
          You earn {COMMISSION_PERCENT}% of what each buyer paid. A sale is pending for {HOLD_DAYS} days (our refund window), then ready to be paid. We email
          you to arrange payment. Keep this page&apos;s address private: anyone with it can see these numbers.
        </p>
      </div>
    </main>
  );
}
