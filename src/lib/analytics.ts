// Google Analytics 4 events. The GA tag itself is loaded in app/layout.tsx; this file only sends events.
//
// Rules for what goes in `params`: major names, scores, levels and share methods only. Never a name,
// email, phone number, address or anything else about a person. Search text is cut to 60 characters.
//
// Never name a parameter source, medium, campaign, term or content: GA4 reads those as TRAFFIC SOURCE fields, so an event
// parameter called `source` silently rewrites where a session "came from" (it once produced a fake "scan" source).

// GA4 ecommerce events carry an `items` list, so a value may also be a list of small objects.
type Params = Record<string, string | number | boolean | Array<Record<string, string | number>>>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Lower-case, dash-separated id for a major: "Computer Science" -> "computer-science". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Sends one GA4 event. Never throws. If the GA script has not finished loading yet, the event is queued
 * on dataLayer in the shape gtag.js expects (an `arguments` object) and is sent once it loads.
 */
const TRAFFIC_SOURCE_FIELDS = ["source", "medium", "campaign", "term", "content", "campaign_id", "gclid"];

export function track(name: string, params: Params = {}): void {
  if (typeof window === "undefined") return;
  if (process.env.NODE_ENV !== "production") {
    for (const key of TRAFFIC_SOURCE_FIELDS) {
      if (key in params) console.warn(`[analytics] "${name}" sends "${key}": GA4 reads that as a traffic source field. Rename the parameter.`);
    }
  }
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", name, params);
    } else {
      queue("event", name, params);
    }
  } catch {}
}

/**
 * Marks this browser as the owner's (testing, the private payments gate): from now on its events carry
 * traffic_type=internal, which a GA4 data filter can exclude. Also remembered for future visits (see layout.tsx).
 */
export function markInternal(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("cm_internal", "1");
  } catch {}
  try {
    window.gtag?.("set", { traffic_type: "internal" });
  } catch {}
}

function queue(..._args: unknown[]) {
  (window.dataLayer = window.dataLayer || []).push(arguments); // eslint-disable-line prefer-rest-params
}

/** The fields most events share about a major. */
export function majorParams(m: { name: string; score: number; level: string }): Params {
  return {
    major_name: m.name,
    major_slug: slugify(m.name),
    cooked_score: m.score,
    cooked_level: slugify(m.level),
  };
}

/** GA4's recommended `share` event. Call it when the visitor actually acts, not when a menu opens. */
export type ShareMethod = "twitter" | "whatsapp" | "copy_link" | "native_share" | "download" | "other";

export function trackShare(method: ShareMethod, majorName: string): void {
  track("share", { method, content_type: "major_result", item_id: slugify(majorName) });
}
