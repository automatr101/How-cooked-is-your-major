"use client";

import { useState } from "react";

export function UnsubscribeForm({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  async function go() {
    setState("busy");
    try {
      const res = await fetch(`/api/unsubscribe?t=${token}`, { method: "POST" });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }
  if (state === "done") return <p className="font-bold">Done. You will not get any more emails from us.</p>;
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground">Stop all emails from How Cooked Is Your Major? Press the button to confirm.</p>
      <button
        type="button"
        onClick={go}
        disabled={state === "busy"}
        className="rounded-full bg-primary px-6 py-3 text-sm font-black uppercase tracking-widest text-primary-foreground disabled:opacity-60"
      >
        {state === "busy" ? "Working..." : "Unsubscribe me"}
      </button>
      {state === "error" && <p role="alert" className="text-sm font-bold text-red-400">Something went wrong. Try again, or contact us.</p>}
    </div>
  );
}
