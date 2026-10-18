"use client";

import { useEffect } from "react";

// A visitor who arrives by a campus ambassador's link (/?ref=<code>): tell the server once per visit, so it can keep the
// code in a cookie and credit a purchase made later. Renders nothing.

export function RefCapture() {
  useEffect(() => {
    try {
      const code = new URLSearchParams(window.location.search).get("ref")?.trim().toLowerCase();
      if (!code || !/^[a-z0-9-]{4,24}$/.test(code) || sessionStorage.getItem("cm_ref_sent") === code) return;
      sessionStorage.setItem("cm_ref_sent", code);
      fetch("/api/ref", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }), keepalive: true }).catch(() => {});
    } catch {}
  }, []);
  return null;
}
