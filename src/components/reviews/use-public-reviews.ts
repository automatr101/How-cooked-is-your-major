"use client";

import { useEffect, useState } from "react";
import type { PublicReviews } from "@/lib/reviews/store";

// One fetch of /api/reviews/public per page view per major, shared by everything on the page that shows real review
// numbers. Until it answers (or if it fails) it is null and the page shows no review UI at all: nothing is ever shown
// from a guess or a default.

const cache = new Map<string, Promise<PublicReviews | null>>();

export function usePublicReviews(majorSlug?: string): PublicReviews | null {
  const key = majorSlug ?? "";
  const [data, setData] = useState<PublicReviews | null>(null);
  useEffect(() => {
    let live = true;
    if (!cache.has(key)) {
      cache.set(
        key,
        fetch(`/api/reviews/public${key ? `?major=${encodeURIComponent(key)}` : ""}`)
          .then((r) => (r.ok ? (r.json() as Promise<PublicReviews>) : null))
          .catch(() => null)
      );
    }
    cache.get(key)!.then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [key]);
  return data;
}
