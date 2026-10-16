"use client";

import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { slugify } from "@/lib/analytics";
import { usePublicReviews } from "./use-public-reviews";

// "Was your score accurate?" under the roast on the free result. One thumb per major per browser. It stores only the thumb
// and the major. Shown only when the database is set up (otherwise there would be nowhere real to put the vote).

const key = (slug: string) => `cm_fb:${slug}`;
const voted = (slug: string) => {
  try {
    return localStorage.getItem(key(slug));
  } catch {
    return null;
  }
};

export function AccuracyPoll({ majorName }: { majorName: string }) {
  const slug = slugify(majorName);
  const reviews = usePublicReviews(slug);
  // Remembered per browser; read after mount so the server and first client render match
  const [local, setLocal] = useState<string | null | undefined>(undefined);
  const [state, setState] = useState<"idle" | "sending" | "error">("idle");
  const [hp, setHp] = useState(""); // honeypot

  if (!reviews?.enabled) return null;
  const already = local === undefined ? voted(slug) : local;
  const done = already === "up" || already === "down";

  const send = async (accurate: boolean) => {
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/reviews/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ major: majorName, accurate, hp }),
      });
      if (!res.ok && res.status !== 204) return setState("error");
      try {
        localStorage.setItem(key(slug), accurate ? "up" : "down");
      } catch {}
      setLocal(accurate ? "up" : "down");
      setState("idle");
    } catch {
      setState("error");
    }
  };

  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs">
      {done ? (
        <p role="status" className="font-bold text-muted-foreground">
          Thanks. {already === "up" ? "Glad it felt right." : "Noted: we use this to fix scores."}
        </p>
      ) : (
        <>
          <span className="font-black uppercase tracking-widest text-muted-foreground">Was your score accurate?</span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={() => send(true)}
              disabled={state === "sending"}
              aria-label="Yes, my score was accurate"
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition hover:bg-muted active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ThumbsUp aria-hidden className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => send(false)}
              disabled={state === "sending"}
              aria-label="No, my score was not accurate"
              className="grid h-10 w-10 place-items-center rounded-full border border-border text-foreground transition hover:bg-muted active:scale-95 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ThumbsDown aria-hidden className="h-4 w-4" />
            </button>
          </span>
          <span aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <input tabIndex={-1} autoComplete="off" name="hp" value={hp} onChange={(e) => setHp(e.target.value)} />
          </span>
          {state === "error" && (
            <span role="alert" className="font-bold text-destructive">
              Could not send that. Try again.
            </span>
          )}
        </>
      )}
    </div>
  );
}
