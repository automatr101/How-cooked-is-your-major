import type { Metadata } from "next";
import Link from "next/link";
import { UnsubscribeForm } from "./unsubscribe-form";

export const metadata: Metadata = {
  title: "Unsubscribe | How Cooked Is Your Major?",
  robots: { index: false, follow: false },
};

// The link in every email lands here. Nothing happens until the button is pressed, so a mail scanner that merely opens the
// link cannot unsubscribe (or confirm) anyone.
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const token = typeof t === "string" && /^[a-f0-9]{48}$/.test(t) ? t : "";
  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-10 font-sans text-foreground">
      <div className="mx-auto max-w-md space-y-6">
        <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter">Unsubscribe.</h1>
        {token ? <UnsubscribeForm token={token} /> : <p className="text-muted-foreground">This link is not valid. Use the link in the email you got, or <Link className="underline" href="/contact">contact us</Link>.</p>}
        <Link href="/" className="inline-block text-xs font-black uppercase tracking-[0.3em] text-muted-foreground hover:text-primary">Back home</Link>
      </div>
    </main>
  );
}
