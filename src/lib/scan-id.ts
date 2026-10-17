// A short random ID for the result card ("#A7X-42"). Made up fresh for each browser session and kept for that session, so the same
// card keeps the same ID while you look at it. It is a label, not a counter: it says nothing about how many scans there have been.

const LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const KEY = "cm_scan_id";

const pick = (s: string) => s[Math.floor(Math.random() * s.length)];

export function scanId(): string {
  try {
    const saved = sessionStorage.getItem(KEY);
    if (saved && /^#[A-Z][0-9][A-Z]-[0-9]{2}$/.test(saved)) return saved;
  } catch {}
  const id = `#${pick(LETTERS)}${pick("0123456789")}${pick(LETTERS)}-${pick("0123456789")}${pick("0123456789")}`;
  try {
    sessionStorage.setItem(KEY, id);
  } catch {}
  return id;
}
