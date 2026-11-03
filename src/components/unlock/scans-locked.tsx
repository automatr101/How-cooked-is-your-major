import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";

// Shown instead of a page that would give a score away while the paid-unlock experiment runs.
export function ScansLocked({ title }: { title: string }) {
  return (
    <main className="min-h-[70vh] bg-background px-6 text-foreground">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 pt-24 text-center">
        <Lock className="h-10 w-10 text-primary" aria-hidden />
        <h1 className="text-4xl font-black uppercase italic leading-[0.95] tracking-tighter sm:text-5xl">{title}</h1>
        <p className="text-muted-foreground">Results are locked for now. Scan a major on the home page and unlock its result there.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-sm font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Go to the scanner
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
