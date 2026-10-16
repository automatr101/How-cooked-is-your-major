import { timingSafeEqual } from "node:crypto";
import { sign, verifySignature } from "@/lib/payments/signing";

// SERVER ONLY. The owner's review admin. It is closed unless REVIEWS_ADMIN_KEY (16+ characters) is set; with no key set,
// every admin address answers 404, as if it did not exist. The key is typed into a form (it is never put in a web address,
// so it does not land in browser history or logs); a correct key gives this browser a signed cookie for 12 hours.

const COOKIE = "cm_admin";
const MAX_AGE_SECONDS = 12 * 60 * 60;

function adminKey(): string | null {
  const k = process.env.REVIEWS_ADMIN_KEY;
  return k && k.length >= 16 ? k : null;
}

export const adminEnabled = (): boolean => adminKey() !== null;

export function keyMatches(given: string): boolean {
  const key = adminKey();
  if (!key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function adminCookie(): { name: string; value: string; maxAge: number } {
  const payload = `admin.${Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS}`;
  return { name: COOKIE, value: `${payload}.${sign(payload)}`, maxAge: MAX_AGE_SECONDS };
}

/** Is this cookie value a valid, unexpired admin cookie? (Always false when the admin is closed.) */
export function validAdminCookie(value: string | undefined): boolean {
  if (!value || !adminEnabled()) return false;
  try {
    const cut = value.lastIndexOf(".");
    const payload = value.slice(0, cut);
    if (cut < 0 || !verifySignature(payload, value.slice(cut + 1))) return false;
    const expires = Number(payload.split(".")[1]);
    return payload.startsWith("admin.") && Number.isFinite(expires) && expires > Date.now() / 1000;
  } catch {
    return false; // a misconfigured secret closes the admin rather than opening it
  }
}

export const ADMIN_COOKIE_NAME = COOKIE;
