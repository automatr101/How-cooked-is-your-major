import type { Tier } from "./types";

// ── AI products ────────────────────────────────────────────────
// Used by the {ai}, {ai2}, {ai3}, {aiCode}, {aiSearch}, {aiImg} and {aiDoc} tokens.
// Jokes using these are satire. Never write a line that claims a specific model
// really can (or can't) replace a profession as a factual statement.

export const AI_GENERAL = [
  "ChatGPT",
  "Claude",
  "Gemini",
  "Grok",
  "DeepSeek",
  "Mistral",
  "Llama",
  "Qwen",
  "Perplexity",
  "Microsoft Copilot",
];
export const AI_CODE = ["Cursor", "GitHub Copilot", "Claude", "DeepSeek", "ChatGPT", "Gemini", "Qwen"];
export const AI_SEARCH = ["Perplexity", "Gemini", "ChatGPT", "Grok"];
export const AI_IMAGE = ["Midjourney", "Gemini", "ChatGPT", "Grok"];
export const AI_DOC = ["NotebookLM", "Microsoft Copilot", "Claude", "ChatGPT"];

/** Two names that are really the same product, so they should not appear back to back. */
export const aiKey = (name: string) => name.toLowerCase().replace(/^(microsoft|github) /, "");

// ── Tone modifiers ─────────────────────────────────────────────
// Optional flavour layered on top of a finished roast. Never forced onto every roast.

/** Short openers, only added to roasts that don't already start like one. */
export const OPENERS = [
  "bro,",
  "ngl,",
  "respectfully,",
  "no because",
  "ain't no way:",
  "lowkey,",
  "not to be dramatic but",
  "chat,",
  "be so for real,",
  "genuinely,",
  "okay but",
  "fr tho,",
];

/** Words that mean a roast already has an opener. */
export const OPENER_STARTS = /^(bro|ngl|respectfully|no because|ain't no way|lowkey|not to be dramatic|chat|be so|genuinely|okay but|fr tho|honestly|imagine|ok|okay|ain't|we need|it's over|it's giving)\b/i;

/** Emoji tails, by tier. */
export const TAILS: Record<Tier, string[]> = {
  low: ["🫡", "😎", "📈", "🔥", "✅", "🙏", "😌"],
  mid: ["😬", "🤨", "😭", "📉", "🫠", "🙂", "🤷"],
  high: ["💀", "😭", "📉", "🤡", "🫡", "🔥", "😬"],
  extreme: ["💀💀", "😭😭", "☠️", "🪦", "🚨", "📉💀", "🫡", "🤡"],
};

// ── Punchlines for the {punch} token, by tier ──────────────────

export const PUNCH: Record<Tier, string[]> = {
  low: [
    "so yeah, you're good.",
    "respect, honestly.",
    "eating, no notes.",
    "it's almost unfair.",
    "try not to be insufferable about it.",
    "the group chat is jealous.",
  ],
  mid: [
    "could go either way tbh.",
    "the jury is still out.",
    "we'll see.",
    "it's giving 'it depends'.",
    "depends how the next 6 months go.",
    "stay tuned, i guess.",
  ],
  high: [
    "not looking great, chief.",
    "tough break.",
    "anyway, update the résumé.",
    "it is what it is.",
    "that's a lot of vibes for a plan.",
    "bold strategy.",
  ],
  extreme: [
    "light a candle.",
    "it's so over (affectionately).",
    "we move.",
    "thoughts and prayers.",
    "no further questions.",
    "we're so back (we are not).",
  ],
};
