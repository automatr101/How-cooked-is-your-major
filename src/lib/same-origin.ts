// Which website made this request? Used by the routes that change something or hand out a cookie.

/**
 * True when a browser sent this request on behalf of a DIFFERENT website.
 *
 * Our own pages are the only legitimate callers of those routes, and a browser cannot be made to lie about where a
 * request came from: a web page cannot set `Sec-Fetch-Site`, and every browser that predates it sends `Origin` with a
 * POST. A request with neither header did not come from a browser (curl, a payment provider's server, our own test
 * scripts), so another website cannot be steering it through a visitor, and it passes. This keeps other sites from
 * using a visitor's browser to start payments, collect cookies or send messages; it does not prove who the caller is.
 */
export function isCrossSite(secFetchSite: string | null, origin: string | null, requestUrl: string): boolean {
  if (secFetchSite) return secFetchSite !== "same-origin" && secFetchSite !== "none"; // "none": typed into the address bar
  if (origin === null) return false;
  try {
    return origin !== new URL(requestUrl).origin; // also true for the literal "null" that sandboxed pages send
  } catch {
    return true;
  }
}

export const crossSite = (req: Request): boolean =>
  isCrossSite(req.headers.get("sec-fetch-site"), req.headers.get("origin"), req.url);
