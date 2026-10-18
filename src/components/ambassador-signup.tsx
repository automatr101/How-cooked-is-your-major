"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { track } from "@/lib/analytics";

// Campus ambassador sign-up. On success it shows the share link and the private stats link, once: there is no email yet,
// so the visitor is told plainly to save the stats link.

const input =
  "w-full rounded-full border border-border bg-background px-5 py-3 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-primary/60";

function CopyRow({ label, value, id }: { label: string; value: string; id: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <input id={id} readOnly value={value} onFocus={(e) => e.target.select()} className={`${input} min-w-0 font-mono text-xs`} />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(value).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }, () => {});
          }}
          aria-label={`Copy ${label}`}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition active:scale-95"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function AmbassadorSignup({ enabled }: { enabled: boolean }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [campus, setCampus] = useState("");
  const [consent, setConsent] = useState(false);
  const [hp, setHp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ link: string; dashboard: string } | null>(null);

  if (!enabled) {
    return <p className="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">Sign-ups open soon.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (!consent) return setError("Tick the box to agree to the program rules.");
    setBusy(true);
    try {
      const res = await fetch("/api/ambassadors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, campus, consent: true, hp }),
      });
      const data = (await res.json().catch(() => ({}))) as { link?: string; dashboard?: string; error?: string };
      if (!res.ok || !data.link || !data.dashboard) {
        setError(
          data.error === "invalid_email"
            ? "That email does not look right."
            : data.error === "name_required"
              ? "Add your name."
              : data.error === "campus_required"
                ? "Add your school or campus."
                : data.error === "already_signed_up"
                  ? "That email is already an ambassador. Lost your links? Message us through the contact page."
                  : data.error === "too_many_requests"
                    ? "Too many tries. Give it a bit."
                    : "Could not sign you up. Try again in a minute."
        );
        return;
      }
      setDone({ link: data.link, dashboard: data.dashboard });
      track("ambassador_signup", {});
    } catch {
      setError("Could not sign you up. Try again in a minute.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section aria-label="Your ambassador links" className="space-y-5 rounded-3xl border border-primary/30 bg-card p-6">
        <h3 className="text-2xl font-black uppercase italic leading-[0.98] tracking-tighter">You&apos;re in.</h3>
        <CopyRow id="amb-link" label="Your link (share this)" value={done.link} />
        <CopyRow id="amb-dash" label="Your private stats page" value={done.dashboard} />
        <p className="rounded-2xl bg-primary/10 p-4 text-sm font-bold leading-relaxed">
          Save the stats link now (bookmark it or send it to yourself). It is your only key to your numbers, and we can&apos;t show it again on this page. Don&apos;t share it.
        </p>
        <a href={done.dashboard} className="inline-block rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground">Open my stats</a>
      </section>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-3xl border border-border bg-card p-6">
      <label className="sr-only" htmlFor="amb-name">Your name</label>
      <input id="amb-name" required maxLength={60} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={input} />
      <label className="sr-only" htmlFor="amb-email">Email</label>
      <input id="amb-email" type="email" inputMode="email" autoComplete="email" required maxLength={120} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className={input} />
      <label className="sr-only" htmlFor="amb-campus">School or campus</label>
      <input id="amb-campus" required maxLength={80} value={campus} onChange={(e) => setCampus(e.target.value)} placeholder="School or campus (e.g. KNUST)" className={input} />
      {/* Hidden field real visitors never fill in */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden value={hp} onChange={(e) => setHp(e.target.value)} className="absolute left-[-9999px] h-0 w-0 opacity-0" />
      <label className="flex items-start gap-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#FF6A00]" />
        <span>
          I agree to the program rules on this page, and to being emailed about my payouts.{" "}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">Privacy</a>
        </span>
      </label>
      {error && <p role="alert" className="text-xs font-bold text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-full bg-primary px-6 py-3.5 text-sm font-black uppercase tracking-widest text-primary-foreground transition hover:scale-[1.02] active:scale-95 disabled:opacity-60"
      >
        {busy ? "Signing you up..." : "Get my link"}
      </button>
    </form>
  );
}
