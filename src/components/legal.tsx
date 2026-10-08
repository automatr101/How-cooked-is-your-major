import type { ReactNode } from "react";
import Link from "next/link";

// Shared look for the legal pages (privacy, terms, refunds), so they read the same and stay easy to edit.

export const LEGAL_UPDATED = "October 8, 2026";
export const SITE_URL = "https://how-cooked-is-your-major.vercel.app";

const PAGES = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refunds", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

export function LegalPage({ title, intro, current, children }: { title: string; intro: ReactNode; current: string; children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-6 pb-24 pt-32 text-foreground">
      <div className="mx-auto max-w-3xl space-y-10">
        <div className="space-y-3">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Last updated: {LEGAL_UPDATED}</p>
          <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter sm:text-5xl">{title}</h1>
          <div className="text-base leading-relaxed text-muted-foreground">{intro}</div>
          <nav aria-label="Legal pages" className="flex flex-wrap gap-x-4 gap-y-2 pt-2 text-[10px] font-black uppercase tracking-widest">
            {PAGES.map((p) => (
              <Link
                key={p.href}
                href={p.href}
                aria-current={p.href === current ? "page" : undefined}
                className={p.href === current ? "text-foreground underline underline-offset-4" : "text-muted-foreground transition-colors hover:text-foreground"}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </main>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <>
      <hr className="border-border" />
      <section className="space-y-3">
        <h2 className="text-2xl font-black uppercase tracking-tighter">
          {n}. {title}
        </h2>
        {children}
      </section>
    </>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed text-muted-foreground">{children}</p>;
}

export function UL({ children }: { children: ReactNode }) {
  return <ul className="list-inside list-disc space-y-2 pl-4 text-muted-foreground">{children}</ul>;
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="text-foreground">{children}</strong>;
}

export function Ext({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">
      {children}
    </a>
  );
}

export function Int({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-primary underline underline-offset-4">
      {children}
    </Link>
  );
}

export function ContactBox() {
  return (
    <div className="space-y-1 rounded-2xl border border-border bg-card p-6">
      <p className="font-black text-foreground">MajorLabs Intelligence</p>
      <p className="text-sm text-muted-foreground">
        Contact form: <Int href="/contact">{SITE_URL.replace("https://", "")}/contact</Int>
      </p>
      <p className="text-sm text-muted-foreground">
        Twitter/X: <Ext href="https://twitter.com/cookedlabs_cto">@cookedlabs_cto</Ext>
      </p>
    </div>
  );
}
