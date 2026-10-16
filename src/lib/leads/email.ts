// SERVER ONLY. Sends email through Resend's REST API (no package). Completely off until both are set:
//   RESEND_API_KEY   from resend.com (needs a verified sending domain)
//   EMAIL_FROM       e.g. "How Cooked Is Your Major? <hello@yourdomain.com>"  (the address must be on the verified domain)
//   RESEND_API_BASE  only for testing against a fake server
// Every message carries the List-Unsubscribe headers (one-click) and an unsubscribe link in the body.

const API = process.env.RESEND_API_BASE ?? "https://api.resend.com";

export function emailEnabled(): boolean {
  return !!process.env.RESEND_API_KEY?.trim() && !!process.env.EMAIL_FROM?.trim();
}

export interface Outgoing {
  to: string;
  subject: string;
  html: string;
  text: string;
  unsubscribeUrl: string;
}

/** Returns true when Resend accepted the message. Never throws with the address or the key in the message. */
export async function sendEmail(m: Outgoing): Promise<boolean> {
  if (!emailEnabled()) return false;
  try {
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY!.trim()}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM!.trim(),
        to: [m.to],
        subject: m.subject,
        html: m.html,
        text: m.text,
        headers: { "List-Unsubscribe": `<${m.unsubscribeUrl.replace("/unsubscribe?t=", "/api/unsubscribe?t=")}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error(`[email] Resend answered ${res.status}`);
    return res.ok;
  } catch {
    console.error("[email] could not reach Resend");
    return false;
  }
}
