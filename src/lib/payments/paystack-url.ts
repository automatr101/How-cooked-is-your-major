// Where a buyer may be sent to pay. The address comes back from Paystack's API and the browser is then redirected to
// it, so it has to be one of Paystack's own https pages. A tampered response or a wrong setting must never be able
// to turn the checkout into a redirect to some other website.

const HOSTS = ["paystack.com", "paystack.co"];

export function isPaystackPage(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    return HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
