import { realMajors, majors } from "@/lib/data";
import { FRIENDS } from "@/content/friends";

// The friends who scanned their major and agreed to be shown. Renders nothing until src/content/friends.ts has entries.

export function FriendsRow() {
  if (FRIENDS.length === 0) return null;
  return (
    <ul className="flex flex-wrap items-start justify-center gap-5" aria-label="Friends who scanned their major">
      {FRIENDS.map((f) => (
        <li key={f.name} className="flex w-24 flex-col items-center gap-1.5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- a handful of small static photos */}
          <img src={f.photo} alt={`${f.name}`} width={56} height={56} decoding="async" className="h-14 w-14 rounded-full border-2 border-background object-cover shadow-xl" />
          <span className="text-xs font-black leading-tight">{f.name}</span>
          <span className="text-[10px] font-medium leading-tight text-muted-foreground">scanned their major</span>
        </li>
      ))}
    </ul>
  );
}

/** Friends who left a quote, with the score read from the data. */
export function FriendQuotes({ className = "" }: { className?: string }) {
  const withQuote = FRIENDS.filter((f) => f.quote);
  if (withQuote.length === 0) return null;
  return (
    <ul className={`grid gap-3 sm:grid-cols-2 ${className}`}>
      {withQuote.map((f) => {
        const m = majors.find((x) => x.name === f.major) ?? realMajors.find((x) => x.name === f.major);
        return (
          <li key={f.name} className="flex gap-3 rounded-2xl border border-border bg-card/60 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- small static photo */}
            <img src={f.photo} alt={f.name} width={44} height={44} decoding="async" className="h-11 w-11 shrink-0 rounded-full object-cover" />
            <div>
              <p className="text-sm leading-relaxed">&ldquo;{f.quote}&rdquo;</p>
              <p className="mt-2 text-[11px] font-bold text-muted-foreground">
                {f.name} · {f.major}
                {m ? ` · ${m.score}% (${m.level})` : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
