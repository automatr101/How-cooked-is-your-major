// SERVER ONLY. What a lead gets: the extended roast (shown on the page right after they sign up, and in the Day 0 email)
// and the three emails. Everything here is built from the site's own data for the major (score, pay range, growth, advice)
// and the roast engine. Nothing is invented: no counts, no quotes, no deadline that is not real.

import { createRoastSession } from "@/lib/roast";
import { SITE_URL } from "@/lib/site";
import { launchInfo } from "@/lib/payments/price";
import { escapeHtml } from "@/lib/telegram";
import type { Major } from "@/lib/data";

export interface ExtendedRoast {
  roasts: string[];
  facts: { label: string; value: string }[];
  advice: string;
}

/** Three more roasts for this major (never the same line twice) plus its real numbers. */
export function extendedRoast(major: Major): ExtendedRoast {
  const session = createRoastSession({ persist: false });
  const roasts: string[] = [];
  for (let i = 0; i < 12 && roasts.length < 3; i++) {
    const r = session.roll({ name: major.name, score: major.score });
    if (!roasts.includes(r.text)) roasts.push(r.text);
  }
  return {
    roasts,
    facts: [
      { label: "AI exposure score", value: `${major.score}/100 (${major.level})` },
      ...(major.salary ? [{ label: "Typical pay range", value: major.salary }] : []),
      ...(major.growth ? [{ label: "Projected role growth", value: major.growth.replace(/ Growth$/i, "") }] : []),
    ],
    advice: major.advice,
  };
}

const ORANGE = "#FF6A00";

function layout(title: string, bodyHtml: string, unsubscribeUrl: string): string {
  return `<!doctype html><html><body style="margin:0;background:#0C0C0C;color:#F4F4F4;font-family:Inter,Arial,sans-serif">
<div style="max-width:560px;margin:0 auto;padding:28px 20px">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:.25em;text-transform:uppercase;color:#A6A6A6">How Cooked Is Your Major?</p>
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.05;text-transform:uppercase;font-weight:900">${title}</h1>
${bodyHtml}
<hr style="border:none;border-top:1px solid #303030;margin:28px 0 14px">
<p style="margin:0;font-size:11px;line-height:1.6;color:#A6A6A6">You are getting this because you asked for your extended roast on ${escapeHtml(SITE_URL.replace("https://", ""))}. Entertainment, not career advice.
<a href="${escapeHtml(unsubscribeUrl)}" style="color:#A6A6A6">Unsubscribe</a>.</p>
</div></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:22px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#FFE0C3;color:#0C0C0C;font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:13px;padding:14px 22px;border-radius:999px;text-decoration:none">${escapeHtml(label)}</a></p>`;

const p = (html: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${html}</p>`;

function siteLink(major: Major, day: 0 | 1 | 2): string {
  const q = new URLSearchParams({ major: major.name, score: String(major.score), level: major.level, utm_source: "email", utm_medium: "email", utm_campaign: "lead_sequence", utm_content: `day${day}` });
  return `${SITE_URL}/?${q.toString()}`;
}

export interface Email {
  subject: string;
  html: string;
  text: string;
}

/** Day 0: the roast + the numbers. */
export function day0(major: Major, unsubscribeUrl: string): Email {
  const e = extendedRoast(major);
  const html = layout(
    `${escapeHtml(major.name)}: ${major.score}% cooked.`,
    p("Your extended roast, as promised:") +
      e.roasts.map((r) => `<p style="margin:0 0 12px;padding:12px 14px;background:#1A1A1A;border-radius:14px;font-size:15px;line-height:1.5">&ldquo;${escapeHtml(r)}&rdquo;</p>`).join("") +
      `<table style="margin:18px 0;border-collapse:collapse;width:100%">${e.facts.map((f) => `<tr><td style="padding:6px 0;color:#A6A6A6;font-size:13px">${escapeHtml(f.label)}</td><td style="padding:6px 0;text-align:right;font-weight:800;font-size:14px">${escapeHtml(f.value)}</td></tr>`).join("")}</table>` +
      p(`<span style="color:${ORANGE};font-weight:800">The move:</span> ${escapeHtml(e.advice)}`) +
      button(siteLink(major, 0), "Back to your result"),
    unsubscribeUrl
  );
  const text = [`${major.name}: ${major.score}% cooked.`, "", ...e.roasts.map((r) => `"${r}"`), "", ...e.facts.map((f) => `${f.label}: ${f.value}`), "", `The move: ${e.advice}`, "", siteLink(major, 0), "", `Unsubscribe: ${unsubscribeUrl}`].join("\n");
  return { subject: `Your ${major.name} roast (${major.score}% cooked)`, html, text };
}

/** Day 1: one real number about their major, plus the one outside projection we use, labelled as a projection. */
export function day1(major: Major, unsubscribeUrl: string): Email {
  const growth = major.growth.replace(/ Growth$/i, "");
  const html = layout(
    "One number to sit with.",
    p(
      major.salary && major.growth
        ? `${escapeHtml(major.name)} has an AI exposure score of <b style="color:${ORANGE}">${major.score}/100</b>, projected role growth of <b>${escapeHtml(growth)}</b> and a typical pay range of <b>${escapeHtml(major.salary)}</b> on this site&rsquo;s data.`
        : `${escapeHtml(major.name)} has an AI exposure score of <b style="color:${ORANGE}">${major.score}/100</b> on this site&rsquo;s data.`
    ) +
      p("The wider picture, from the World Economic Forum&rsquo;s Future of Jobs Report 2025 (a projection, not a promise): 170 million roles created and 92 million displaced by 2030, a net gain of 78 million, and nearly 40% of workplace skills expected to change. The jobs do not vanish. The skills they ask for move.") +
      p("The people who do fine are the ones who moved first.") +
      button(siteLink(major, 1), "See where you stand"),
    unsubscribeUrl
  );
  const text = [major.salary && major.growth ? `${major.name}: AI exposure ${major.score}/100, projected growth ${growth}, typical pay ${major.salary} (this site's data).` : `${major.name}: AI exposure ${major.score}/100 (this site's data).`, "", "WEF Future of Jobs Report 2025 (projection): 170M roles created, 92M displaced by 2030, net +78M; nearly 40% of skills expected to change.", "", siteLink(major, 1), "", `Unsubscribe: ${unsubscribeUrl}`].join("\n");
  return { subject: `The number behind ${major.name}`, html, text };
}

/** Day 2: the paid offer. A deadline is only mentioned when a launch price is really running, with its real end. */
export function day2(major: Major, unsubscribeUrl: string): Email {
  const launch = launchInfo();
  const ends = launch ? new Date(launch.endsAt).toLocaleString("en-GB", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) + " UTC" : null;
  const html = layout(
    "Your Survival Plan.",
    p(`You know the number for ${escapeHtml(major.name)}. The Survival Plan is the next step: a 30/60/90-day roadmap, portfolio projects, career paths, the skills and AI tools to learn, and a PDF you keep. One payment, no account, no subscription.`) +
      (ends ? p(`<span style="color:${ORANGE};font-weight:800">Launch price ends ${escapeHtml(ends)}.</span>`) : "") +
      p("Not worth it? Tell us within 7 days and we refund you in full. No forms.") +
      button(siteLink(major, 2), "Get my Survival Plan"),
    unsubscribeUrl
  );
  const text = [`The Survival Plan for ${major.name}: 30/60/90-day roadmap, projects, career paths, skills and AI tools, a PDF you keep. One payment, no subscription.`, ends ? `Launch price ends ${ends}.` : "", "Not worth it? Tell us within 7 days and we refund you in full. No forms.", "", siteLink(major, 2), "", `Unsubscribe: ${unsubscribeUrl}`].filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
  return { subject: `Your Survival Plan for ${major.name}`, html, text };
}

export const EMAILS = { 0: day0, 1: day1, 2: day2 } as const;
