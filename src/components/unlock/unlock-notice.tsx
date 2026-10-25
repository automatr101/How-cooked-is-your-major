import { formatEnd, type ExperimentView } from "@/lib/unlock/shared";

// Said BEFORE anyone scans, so nobody expects a free result: for a short time, scanning is free to try and the result costs
// money to reveal. Shown in the hero and under the search box only while the experiment runs for this visitor.

export function UnlockNotice({ experiment, className = "" }: { experiment: ExperimentView; className?: string }) {
  return (
    <p className={`mx-auto max-w-md rounded-2xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-center text-[12px] font-bold leading-snug ${className}`}>
      Short experiment: scan any major, then unlock the result for {experiment.priceLabel}
      {experiment.approxLabel ? ` (about ${experiment.approxLabel})` : ""}, one-time per major. Free results are back on{" "}
      <time dateTime={experiment.endsAt}>{formatEnd(experiment.endsAt)}</time>.
    </p>
  );
}
