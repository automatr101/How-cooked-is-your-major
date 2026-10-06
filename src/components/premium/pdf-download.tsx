"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Loader2, Printer, RotateCcw } from "lucide-react";
import type { Plan } from "@/lib/plan/types";
import { trackPdfClicked, trackPdfDownloaded, trackPdfFailed } from "@/lib/premium-analytics";

// "Download PDF" for the unlocked report. The file is built on the server, on request, and only for a
// browser whose verified unlock cookie covers this major (see /api/plan/pdf), so there is nothing to
// trust here. If it fails, the visitor can retry; after repeated failures a print-friendly copy of the
// report ("Print / Save as PDF") is offered instead.

type State = "idle" | "busy" | "error" | "done";
const FAILURES_BEFORE_PRINT = 2;

export function usePdfDownload(plan: Plan) {
  const [state, setState] = useState<State>("idle");
  const [failures, setFailures] = useState(0);
  const [openUrl, setOpenUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const busyRef = useRef(false); // a second tap while one is running does nothing

  // Free the downloaded file's temporary address when the report goes away
  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    []
  );

  const download = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    trackPdfClicked(plan.major, plan.planType);
    setState("busy");
    try {
      const res = await fetch(`/api/plan/pdf?major=${encodeURIComponent(plan.major.name)}`, { cache: "no-store" });
      if (!res.ok || !(res.headers.get("content-type") ?? "").includes("application/pdf")) throw new Error(String(res.status));
      const blob = await res.blob();
      const name =
        /filename="?([^";]+)"?/.exec(res.headers.get("content-disposition") ?? "")?.[1] ??
        `MajorLabs-${plan.major.slug}-${plan.planType.replace(/_/g, "-")}.pdf`;

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setOpenUrl(url);

      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();

      trackPdfDownloaded(plan.major, plan.planType);
      setFailures(0);
      setState("done");
    } catch (e) {
      trackPdfFailed(plan.major, plan.planType, e instanceof TypeError ? "network" : "generation_failed");
      setFailures((n) => n + 1);
      setState("error");
    } finally {
      busyRef.current = false;
    }
  }, [plan]);

  // Print / Save as PDF: prints a copy of the report only. The copy is cloned into a hidden holder that the
  // print stylesheet (globals.css) shows alone, so nothing on the screen changes and no blank pages appear.
  const printReport = useCallback(() => {
    const article = document.querySelector("#premium-plan article");
    if (!article) return window.print();
    document.getElementById("print-root")?.remove();
    const holder = document.createElement("div");
    holder.id = "print-root";
    holder.appendChild(article.cloneNode(true));
    document.body.appendChild(holder);
    const cleanup = () => {
      holder.remove();
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
  }, []);

  return { state, failures, openUrl, download, printReport };
}

type Pdf = ReturnType<typeof usePdfDownload>;

/** The button and its messages. Rendered at the top and the bottom of the report, sharing one state. */
export function PdfBar({ pdf }: { pdf: Pdf }) {
  const busy = pdf.state === "busy";
  const showPrint = pdf.state === "error" && pdf.failures >= FAILURES_BEFORE_PRINT;
  return (
    <div className="no-print space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={pdf.download}
          disabled={busy}
          aria-busy={busy}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-widest text-primary-foreground transition active:scale-95 disabled:cursor-wait disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          {busy ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Download aria-hidden className="h-4 w-4" />}
          {busy ? "Preparing your PDF..." : "Download PDF"}
        </button>

        {pdf.state === "error" && (
          <button
            type="button"
            onClick={pdf.download}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <RotateCcw aria-hidden className="h-4 w-4" />
            Retry
          </button>
        )}

        {showPrint && (
          <button
            type="button"
            onClick={pdf.printReport}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-3 text-xs font-black uppercase tracking-widest text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <Printer aria-hidden className="h-4 w-4" />
            Print / Save as PDF
          </button>
        )}
      </div>

      <div aria-live="polite" className="text-xs leading-relaxed text-muted-foreground">
        {pdf.state === "error" && (
          <p role="alert" className="font-bold text-destructive">
            {showPrint
              ? "We still could not prepare the PDF. You can print this report or save it as a PDF from your browser instead."
              : "We could not prepare your PDF. Please try again."}
          </p>
        )}
        {pdf.state === "done" && pdf.openUrl && (
          <p>
            Your PDF is ready. If the download did not start,{" "}
            <a href={pdf.openUrl} target="_blank" rel="noopener" className="font-bold text-foreground underline underline-offset-2">
              open it here
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}
