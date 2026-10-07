import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { majors } from "@/lib/data";
import { slugify } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";
import { ShareRedirect } from "./redirect";

// A tiny page per major, built ahead of time, that exists for one reason: so link previews (X, WhatsApp,
// Facebook, Telegram, ...) get their card from a fast, cached page instead of waiting for the main page to
// be rendered on demand. Crawlers read the tags below and stop. Real visitors are sent straight on to their
// result by the small script in ./redirect (a crawler does not run it, and a server-side redirect would
// make crawlers read the destination page instead).
//
// The site's own Share on X, WhatsApp and Copy text buttons use these addresses: /share/<major-slug>.

export const dynamicParams = false; // an unknown slug is a plain 404

const bySlug = new Map(majors.map((m) => [slugify(m.name), m]));

export function generateStaticParams() {
  return [...bySlug.keys()].map((slug) => ({ slug }));
}

type Props = { params: Promise<{ slug: string }> };

/** Where the real result page for a major lives. */
const resultPath = (m: { name: string; score: number; level: string }) =>
  `/?major=${encodeURIComponent(m.name)}&score=${m.score}&level=${encodeURIComponent(m.level)}`;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const m = bySlug.get(slug);
  if (!m) return {};

  const title = `${m.name} is ${m.level} — ${m.score}% AI Risk`;
  const description = `Survival Status: ${m.level.toUpperCase()}. Check how cooked your major is at MajorLabs Intelligence.`;
  const image = `${SITE_URL}/api/og?major=${encodeURIComponent(m.name)}&score=${m.score}&level=${encodeURIComponent(m.level)}&v=3`;
  const url = `${SITE_URL}/share/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: SITE_URL },
    robots: { index: false, follow: true }, // not a page to rank: the result and the home page are
    other: { "twitter:domain": new URL(SITE_URL).host, "twitter:url": url }, // replaces the site-wide values, which point at the home page
    openGraph: {
      title,
      description,
      url,
      siteName: "How Cooked Is Your Major?",
      images: [{ url: image, width: 1200, height: 630, alt: `${m.name} — ${m.score}% AI Risk` }],
      locale: "en_US",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      site: "@cookedlabs_cto",
      creator: "@cookedlabs_cto",
    },
  };
}

export default async function SharePage({ params }: Props) {
  const { slug } = await params;
  const m = bySlug.get(slug);
  if (!m) return null; // unreachable: dynamicParams is false

  const target = resultPath(m);
  const color = m.score > 80 ? "text-destructive" : m.score > 40 ? "text-orange-500" : "text-emerald-500";

  return (
    <main className="min-h-[70vh] bg-background px-6 text-foreground">
      <ShareRedirect target={target} />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-16 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">MajorLabs Intelligence</p>
        <h1 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tighter sm:text-5xl">{m.name}</h1>
        <p className={`text-7xl font-black tabular-nums tracking-tighter ${color}`}>{m.score}%</p>
        <p className="text-lg font-black uppercase italic">{m.level}</p>
        <Link
          href={target}
          className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          See the full scan
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-muted-foreground">Opening your result…</p>
      </div>
    </main>
  );
}
