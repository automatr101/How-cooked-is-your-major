import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE_URL } from "@/lib/site";
import { ShareRedirect } from "./[slug]/redirect";

// The general-purpose share link for the site itself: /share. Same idea as /share/<major> (a small pre-built
// page for link previews that sends real visitors on), but it shows the default card and sends people to the
// home page. Use it for "try it yourself" posts. Because it is a different address from the home page, X and
// other apps fetch its card fresh instead of showing the one they saved for the home page long ago.

const title = "How Cooked Is Your Major? | AI Risk Scan";
const description = "Check if AI is coming for your degree. Scan 1,800+ majors, get roasted, and get survival advice.";
const image = `${SITE_URL}/api/og?v=3`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: SITE_URL },
  robots: { index: false, follow: true },
  other: { "twitter:domain": new URL(SITE_URL).host, "twitter:url": `${SITE_URL}/share` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/share`,
    siteName: "How Cooked Is Your Major?",
    images: [{ url: image, width: 1200, height: 630, alt: "How Cooked Is Your Major?" }],
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

export default function ShareHomePage() {
  return (
    <main className="min-h-[70vh] bg-background px-6 text-foreground">
      <ShareRedirect target="/" />
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-16 text-center">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">MajorLabs Intelligence</p>
        <h1 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tighter sm:text-5xl">How cooked is your major?</h1>
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Scan your major
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-xs text-muted-foreground">Opening the scanner…</p>
      </div>
    </main>
  );
}
