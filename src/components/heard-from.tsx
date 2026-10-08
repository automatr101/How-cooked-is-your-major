"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";

// "Where did you hear about us?" One tap, shown once per browser under the share buttons, only after a result.
//
// Most visitors arrive by searching the site's name after seeing it somewhere else (a video, a post, a friend), which
// no analytics tool can see. This asks them directly. The answer is one of a fixed list, sent to GA4 as `heard_from`
// with a `heard_via` value: nothing typed by the visitor, nothing about who they are.
//
// It stays out of the way: "Skip" hides it for two weeks, answering hides it for good, and it is never shown to someone
// who arrived through a tagged link (their source is already known) or to the owner's own browsers.

const ANSWERED_KEY = "cm_heard"; // the channel this browser picked
const SKIP_UNTIL_KEY = "cm_heard_skip"; // when to ask again after "Skip" (ms timestamp)
const SKIP_MS = 14 * 24 * 60 * 60 * 1000;

const CHANNELS = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "x", label: "X" },
  { id: "youtube", label: "YouTube" },
  { id: "reddit", label: "Reddit" },
  { id: "whatsapp", label: "WhatsApp" },
  { id: "friend", label: "A friend" },
  { id: "google", label: "Google" },
  { id: "other", label: "Somewhere else" },
] as const;

// Whether this browser has answered, lives in localStorage; reading it through useSyncExternalStore keeps the server
// render and the first client render identical (hidden) and then updates, as the rating popup does.
const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};
const notify = () => listeners.forEach((l) => l());

function shouldHide(): boolean {
  try {
    if (localStorage.getItem(ANSWERED_KEY)) return true;
    if (Date.now() < Number(localStorage.getItem(SKIP_UNTIL_KEY) ?? 0)) return true;
    if (localStorage.getItem("cm_internal") === "1") return true;
    return new URLSearchParams(window.location.search).has("utm_source");
  } catch {
    return true; // no storage (private mode, blocked): do not nag on every result
  }
}

export function HeardFromPoll() {
  const hidden = useSyncExternalStore(subscribe, shouldHide, () => true);
  const [thanks, setThanks] = useState(false);

  useEffect(() => {
    if (!thanks) return;
    const id = setTimeout(() => setThanks(false), 2500);
    return () => clearTimeout(id);
  }, [thanks]);

  const pick = (channel: string) => {
    track("heard_from", { heard_via: channel });
    try {
      localStorage.setItem(ANSWERED_KEY, channel);
    } catch {}
    setThanks(true);
    notify();
  };

  const skip = () => {
    try {
      localStorage.setItem(SKIP_UNTIL_KEY, String(Date.now() + SKIP_MS));
    } catch {}
    notify();
  };

  if (thanks) {
    return (
      <p role="status" className="mt-8 px-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground lg:px-0">
        Thanks, that helps.
      </p>
    );
  }
  if (hidden) return null;

  return (
    <div className="mt-8 px-4 lg:px-0">
      <section aria-labelledby="heard-from-title" className="rounded-2xl border border-border/30 bg-card/60 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 id="heard-from-title" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Quick question: where did you hear about us?
          </h3>
          <button
            type="button"
            onClick={skip}
            className="shrink-0 rounded text-[10px] font-black uppercase tracking-widest text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            Skip
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {CHANNELS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c.id)}
              className="min-h-10 rounded-full border border-border bg-muted px-4 py-2 text-xs font-black uppercase tracking-wider text-foreground transition hover:bg-foreground hover:text-background active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {c.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
