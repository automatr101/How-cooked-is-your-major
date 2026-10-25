// The one interface every payment provider implements. The routes only talk to this, so adding or
// swapping a provider never touches the UI.

export type PaymentStatus = "success" | "failed" | "pending" | "cancelled";

export interface InitializeInput {
  reference: string;
  majorSlug: string;
  majorName: string;
  /** For the provider's receipt only. Never logged and never sent to analytics. */
  email: string;
  /** Where a hosted checkout sends the visitor back to. */
  callbackUrl: string;
  /** The visitor holds a running comeback offer (30% off, see comeback.ts). Decided by the server from a signed cookie. */
  comeback?: boolean;
  /** The 3-major bundle (see bundle.ts). When set, majorSlug/majorName describe the first major only. */
  bundle?: { slug: string; name: string }[];
  /** The paid-unlock experiment (see lib/unlock): this payment reveals ONE result, at the experiment price. */
  unlock?: boolean;
}

export interface InitializeResult {
  reference: string;
  /** Hosted checkout page to send the visitor to. Absent for the test checkout, which is drawn by the site. */
  authorizationUrl?: string;
}

export interface VerifyInput {
  reference: string;
  majorSlug: string;
  /** Test mode only: the server-signed result of the fake checkout. */
  proof?: string;
  /** Stripe only: the Checkout Session id Stripe sent the buyer back with. */
  session?: string;
  /** Verifying a 3-major bundle: majorSlug is then the three slugs joined with commas. */
  bundle?: boolean;
  /** Verifying a paid-unlock payment (see lib/unlock): the product and the price differ from the plan's. */
  unlock?: boolean;
}

export interface VerifyResult {
  status: PaymentStatus;
  transactionId?: string;
  /** The payer's email as Paystack has it. Used only to make a keyed fingerprint; never stored or logged as is. */
  customerEmail?: string;
  /** What the provider says was actually paid, smallest unit and currency. Used to record the purchase at the price it was paid at. */
  amountMinor?: number;
  currency?: string;
  /** Short machine-readable reason when the payment did not succeed. */
  reason?: string;
  /** The provider's own wording for a decline (e.g. "Insufficient Funds"). For the owner's alert only; never sent to the browser. */
  detail?: string;
}

/** An error whose message is safe to show the site owner (never contains keys or customer data). */
export class SafeError extends Error {}

export interface PaymentProvider {
  id: "mock" | "paystack" | "stripe";
  initialize(input: InitializeInput): Promise<InitializeResult>;
  verify(input: VerifyInput): Promise<VerifyResult>;
}
