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
}

export interface VerifyResult {
  status: PaymentStatus;
  transactionId?: string;
  /** The payer's email as Paystack has it. Used only to make a keyed fingerprint; never stored or logged as is. */
  customerEmail?: string;
  /** Short machine-readable reason when the payment did not succeed. */
  reason?: string;
}

export interface PaymentProvider {
  id: "mock" | "paystack";
  initialize(input: InitializeInput): Promise<InitializeResult>;
  verify(input: VerifyInput): Promise<VerifyResult>;
}
