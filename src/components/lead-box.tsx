"use client";

import { useEffect, useState } from "react";
import { Lock, Mail } from "lucide-react";
import type { Major } from "@/lib/data";
import { slugify, track } from "@/lib/analytics";

// "Get your full roast + report sent to you". Sits under the free result. The free result is untouched: only the EXTRA
// roast lines and the numbers are behind the email. It is only shown when the database is set up (GET /api/leads).
// Consent is an unticked box the visitor must tick themselves; nothing is sent or stored without it.

interface Extended {
  roasts: string[];
  facts: { label: string; value: string }[];
  advice: string;
}

const CACHE_KEY = "cm_extended_v1";

function readCache(slug: string): Extended | null {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, Extended>;
    return all[slug] ?? null;
  } catch {
    return null;
  }
}

function writeCache(slug: string, value: Extended) {
  try {
    const all = JSON.parse(localStorage.getItem(CACHE_KEY) ?? "{}") as Record<string, Extended>;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...all, [slug]: value }));
  } catch {}
}

/** The ?ref= the visitor arrived with, kept for the visit (a shared link carries it). */
function readRef(): string | null {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get("ref");
    if (fromUrl && /^[A-Za-z0-9_-]{1,40}$/.test(fromUrl)) sessionStorage.setItem("cm_ref", fromUrl);
    return sessionStorage.getItem("cm_ref");
  } catch {
    return null;
  }
}

export function LeadBox({ major }: { major: Major }) {
  const slug = slugify(major.name);
  const [enabled, setEnabled] = useState(false);
  const [extended, setExtended] = useState<Extended | null>(null);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [alerts, setAlerts] = useState(false);
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [emailed, setEmailed] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Share-to-unlock: any share of this result (X, WhatsApp, saving the card, copying the text) unlocks the same extras, no email
  useEffect(() => {
    const onShared = (e: Event) => {
      const detail = (e as CustomEvent<{ major?: string; method?: string }>).detail;
      if (detail?.major !== major.name || readCache(slug)) return;
      fetch("/api/extended", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ major: major.name, via: detail.method }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { extended?: Extended } | null) => {
          if (!d?.extended) return;
          writeCache(slug, d.extended);
          setExtended(d.extended);
          track("extended_unlocked_by_share", { item_id: slug, method: detail.method ?? "other" });
        })
        .catch(() => {});
    };
    window.addEventListener("cm:shared", onShared);
    return () => window.removeEventListener("cm:shared", onShared);
  }, [major.name, slug]);

  useEffect(() => {
    let live = true;
    setExtended(readCache(slug));
    fetch("/api/leads")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean } | null) => live && setEnabled(!!d?.enabled))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [slug]);

  if (!enabled && !extended) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!consent) return setError("Tick the box so we know it is OK to email you.");
    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, major: major.name, consent: true, score_alerts: alerts, ref: readRef(), hp }),
      });
      const data = (await res.json().catch(() => ({}))) as { extended?: Extended; emailed?: boolean; error?: string };
      if (!res.ok || !data.extended) {
        setError(
          data.error === "invalid_email" ? "That email does not look right." : data.error === "too_many_requests" ? "Too many tries. Give it a bit." : "Could not save that. Try again in a minute."
        );
        return;
      }
      writeCache(slug, data.extended);
      setExtended(data.extended);
      setEmailed(!!data.emailed);
      track("email_captured", { item_id: slug, cooked_score: major.score });
    } catch {
      setError("Could not save that. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  if (extended) {
    return (
      <section aria-label="Your extended roast" className="mx-auto mt-5 w-full max-w-md rounded-3xl border border-primary/25 bg-card/60 p-5 text-left">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Your extended roast</p>
        <ul className="mt-3 space-y-2">
          {extended.roasts.map((r) => (
            <li key={r} className="rounded-2xl bg-background/60 px-4 py-3 text-sm font-bold italic leading-snug">&ldquo;{r}&rdquo;</li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 text-sm">
          {extended.facts.map((f) => (
            <div key={f.label} className="flex justify-between gap-4">
              <dt className="text-muted-foreground">{f.label}</dt>
              <dd className="text-right font-black">{f.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm leading-relaxed">
          <span className="font-black text-primary">The move:</span> {extended.advice}
        </p>
        {emailed && <p className="mt-3 text-[11px] text-muted-foreground">A copy is on its way to your inbox. Check spam if it does not show up.</p>}
      </section>
    );
  }

  return (
    <section aria-label="Get your extended roast" className="mx-auto mt-5 w-full max-w-md rounded-3xl border border-primary/25 bg-card/60 p-5 text-left">
      <p className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
        <Mail aria-hidden className="h-3.5 w-3.5" /> Free extra
      </p>
      <h3 className="mt-2 text-xl font-black italic uppercase leading-[0.98] tracking-tighter">Get your full roast + report sent to you.</h3>
      <div aria-hidden className="mt-3 space-y-2">
        {[88, 71, 80].map((w, i) => (
          <div key={i} className="flex items-center gap-2">
            <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="h-3 rounded-full bg-muted-foreground/20 blur-[1.5px]" style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">3 more roasts, your pay range and growth, and the move to make. Unlocks the moment you sign up, or when you share your card.</p>
      <form onSubmit={submit} className="mt-4 space-y-3" noValidate>
        <label className="sr-only" htmlFor="lead-email">Email</label>
        <input
          id="lead-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={120}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        />
        {/* Hidden field real visitors never fill in */}
        <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} className="absolute left-[-9999px] h-0 w-0 opacity-0" />
        <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6A00]" />
          <span>
            Email me my roast and 2 short follow-ups (3 emails in total, one of them about the paid plan). Unsubscribe in any email.{" "}
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Privacy</a>
          </span>
        </label>
        <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-muted-foreground">
          <input type="checkbox" checked={alerts} onChange={(e) => setAlerts(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6A00]" />
          <span>Also email me if the score for {major.name} changes (optional, one email per change).</span>
        </label>
        {error && <p role="alert" className="text-xs font-bold text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground transition hover:scale-[1.02] active:scale-95 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {busy ? "Sending..." : "Unlock my full roast"}
        </button>
      </form>
    </section>
  );
}
