// Safe for the browser and the server: names and the shape of what the server tells the page about the experiment.

/** Every analytics event of the paid-unlock experiment carries this as `experiment`. */
export const EXPERIMENT_ID = "paid_unlock_199_v1";
export const EXPERIMENT_VARIANT = "paywall";

/** What the page knows about a running experiment, decided by the server for THIS visitor on every page load. */
export interface ExperimentView {
  endsAt: string; // ISO time the experiment ends and free results return
  priceLabel: string; // "$1.99", or "GHS 18.70" for visitors paying in cedis
  /** Shown next to a cedi price so the dollar price is never hidden. */
  approxLabel?: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "28 Oct, 14:00 UTC". Done by hand so the server and the browser always print exactly the same thing. */
export function formatEnd(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}
