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
