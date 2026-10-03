// Fire-and-forget pings to /api/notify (Telegram alerts). Never throws and never blocks the UI.

function send(payload: Record<string, string>) {
  try {
    const body = JSON.stringify({ ...payload, referrer: document.referrer });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/notify", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/notify", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {}
}

/** Once per browser session, so refreshes and re-renders don't repeat the alert. */
export function notifyVisit() {
  try {
    if (sessionStorage.getItem("cm_visit_sent")) return;
    sessionStorage.setItem("cm_visit_sent", "1");
  } catch {}
  send({ type: "visit" });
}

export function notifyScan(majorName: string) {
  send({ type: "scan", major: majorName });
}
