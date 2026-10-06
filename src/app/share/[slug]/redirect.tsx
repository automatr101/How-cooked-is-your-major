"use client";

import { useEffect } from "react";

// Sends a real visitor on to the result page, keeping any campaign tags (utm_source and friends) from the
// shared link, so Google Analytics and the "came from a share" event still see them. Link-preview crawlers
// do not run scripts, so they stay on the page and read its tags.
export function ShareRedirect({ target }: { target: string }) {
  useEffect(() => {
    const extra = window.location.search.replace(/^\?/, "");
    window.location.replace(extra ? `${target}&${extra}` : target);
  }, [target]);
  return null;
}
