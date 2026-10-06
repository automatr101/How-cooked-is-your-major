// The shape of AI-written plan content, and the checks every piece must pass before it is allowed into the
// product. Used by scripts/generate-plans.mjs (when writing) and by `npm run plans:check` (when auditing).
// Pure TypeScript with no imports from the app, so the script can compile it on its own.
//
// Anything that fails is rejected and the major keeps the hand-written template. These rules exist because
// free models sometimes invent statistics, copy the example, drift into hype, or get gloomy about a safe major.

export interface GeneratedItem {
  title: string;
  why: string;
}

export interface GeneratedPlan {
  /** Bump when the shape changes, so old entries can be found and redone. */
  v: 1;
  /** Which model wrote it (for audits). */
  model: string;
  atRisk: string[];
  staysHuman: string[];
  strongPaths: GeneratedItem[];
  vulnerablePaths: GeneratedItem[];
  skills: GeneratedItem[];
  aiTools: GeneratedItem[];
  projects: GeneratedItem[];
  internship: string[];
  positioning: string[];
}

export interface Context {
  name: string;
  /** A short natural name for the major ("Nursing"). */
  nick: string;
  score: number;
  /** The hand-written content for this major's field, to make sure the model did not just copy it. */
  template: {
    skills: [string, string][];
    tools: [string, string][];
    projects: [string, string][];
    strongPaths: [string, string][];
    vulnerablePaths: [string, string][];
  };
}

export interface Result {
  ok: boolean;
  errors: string[];
  value?: Omit<GeneratedPlan, "model">;
}

// [min, max] items per list
const COUNTS = {
  atRisk: [3, 5],
  staysHuman: [3, 5],
  strongPaths: [3, 5],
  vulnerablePaths: [2, 4],
  skills: [5, 7],
  aiTools: [5, 7],
  projects: [3, 5],
  internship: [3, 5],
  positioning: [3, 4],
} as const;

const TITLE_MAX = 70;
const WHY_MAX = 240;
const LINE_MAX = 230;
const MIN_LEN = 12;

// Typographic characters become plain ones; anything else outside Latin-1 is rejected (the PDF fonts only cover Latin).
function normalise(s: string): string {
  return s
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BANNED: [RegExp, string][] = [
  [/https?:|www\.|\.com\b|@\w/i, "contains a link or handle"],
  [/\d+(\.\d+)?\s*(%|percent)|\bpercent\b/i, "contains a percentage"],
  [/[$£€]\s?\d|\b\d[\d,.]*\s*(million|billion|k\b)/i, "contains a money or population figure"],
  [/guarantee|certain to|definitely will|will definitely|100 ?%|never fail/i, "makes a guarantee"],
  [/\b(study|studies|research|survey|report|data)\s+(shows?|found|proves?|suggests?|indicates?)\b|according to\b|statistics (show|prove)/i, "cites a study or statistic"],
  [/[*#`]|^\s*[-•]\s/m, "contains markdown"],
  [/as an ai\b|language model|i cannot\b|i can't\b|sorry,/i, "sounds like a chatbot reply"],
];
const NEGATIVE_FOR_SAFE = /doomed|hopeless|worthless|obsolete|dead[- ]?end|no future|will disappear|panic|cooked|wiped out|useless/i;

const STOP = new Set(["bachelor", "science", "sciences", "studies", "applied", "technology", "management", "with", "and", "the", "for", "honours", "degree", "master", "doctor"]);

function words(s: string): string[] {
  return s.toLowerCase().match(/[a-z]{3,}/g) ?? []; // 3 letters, so "law" and "art" count
}

function checkText(label: string, text: string, ctx: Context, errors: string[]) {
  for (const [re, why] of BANNED) if (re.test(text)) errors.push(`${label}: ${why}`);
  if (ctx.score < 40 && NEGATIVE_FOR_SAFE.test(text)) errors.push(`${label}: negative wording for a safe major`);
  for (const ch of text) if (ch.codePointAt(0)! > 255) { errors.push(`${label}: unsupported character "${ch}"`); break; }
}

function strings(raw: unknown, key: keyof typeof COUNTS, ctx: Context, errors: string[]): string[] {
  const [min, max] = COUNTS[key];
  if (!Array.isArray(raw)) { errors.push(`${key}: not a list`); return []; }
  const out = raw.filter((x): x is string => typeof x === "string").map(normalise).filter(Boolean);
  if (out.length < min) errors.push(`${key}: ${out.length} items, need at least ${min}`);
  const kept = out.slice(0, max);
  kept.forEach((t, i) => {
    if (t.length < MIN_LEN || t.length > LINE_MAX) errors.push(`${key}[${i}]: length ${t.length} outside ${MIN_LEN}-${LINE_MAX}`);
    checkText(`${key}[${i}]`, t, ctx, errors);
  });
  return kept;
}

function items(raw: unknown, key: keyof typeof COUNTS, ctx: Context, errors: string[]): GeneratedItem[] {
  const [min, max] = COUNTS[key];
  if (!Array.isArray(raw)) { errors.push(`${key}: not a list`); return []; }
  const out: GeneratedItem[] = [];
  for (const x of raw) {
    if (x && typeof x === "object" && typeof (x as GeneratedItem).title === "string" && typeof (x as GeneratedItem).why === "string") {
      out.push({ title: normalise((x as GeneratedItem).title), why: normalise((x as GeneratedItem).why) });
    }
  }
  if (out.length < min) errors.push(`${key}: ${out.length} items, need at least ${min}`);
  const kept = out.slice(0, max);
  kept.forEach((it, i) => {
    if (it.title.length < 4 || it.title.length > TITLE_MAX) errors.push(`${key}[${i}].title: length ${it.title.length} outside 4-${TITLE_MAX}`);
    if (/[.!?]$/.test(it.title)) errors.push(`${key}[${i}].title: ends with punctuation`);
    if (it.why.length < 20 || it.why.length > WHY_MAX) errors.push(`${key}[${i}].why: length ${it.why.length} outside 20-${WHY_MAX}`);
    checkText(`${key}[${i}].title`, it.title, ctx, errors);
    checkText(`${key}[${i}].why`, it.why, ctx, errors);
  });
  const titles = kept.map((k) => k.title.toLowerCase());
  if (new Set(titles).size !== titles.length) errors.push(`${key}: repeated titles`);
  return kept;
}

/** Checks one model answer for one major. Returns the cleaned value when everything passes. */
export function validateGenerated(raw: unknown, ctx: Context): Result {
  const errors: string[] = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: ["not a JSON object"] };
  const r = raw as Record<string, unknown>;

  const value = {
    v: 1 as const,
    atRisk: strings(r.atRisk, "atRisk", ctx, errors),
    staysHuman: strings(r.staysHuman, "staysHuman", ctx, errors),
    strongPaths: items(r.strongPaths, "strongPaths", ctx, errors),
    vulnerablePaths: items(r.vulnerablePaths, "vulnerablePaths", ctx, errors),
    skills: items(r.skills, "skills", ctx, errors),
    aiTools: items(r.aiTools, "aiTools", ctx, errors),
    projects: items(r.projects, "projects", ctx, errors),
    internship: strings(r.internship, "internship", ctx, errors),
    positioning: strings(r.positioning, "positioning", ctx, errors),
  };

  // Specific to THIS major: its own words must show up in the career paths, skills or projects
  const every = [...new Set([...words(ctx.name), ...words(ctx.nick)])].filter((w) => w !== "and" && w !== "the");
  const own = every.filter((w) => !STOP.has(w)).length ? every.filter((w) => !STOP.has(w)) : every; // a name made only of generic words still needs one of them
  const specificText = [...value.strongPaths, ...value.skills, ...value.projects].map((i) => `${i.title} ${i.why}`).join(" ").toLowerCase();
  if (own.length && !own.some((w) => specificText.includes(w.slice(0, Math.max(3, w.length - 2))))) {
    errors.push(`not specific: none of ${own.slice(0, 4).join("/")} appears in the paths, skills or projects`);
  }

  // Not the template again
  const templateTitles = new Set(
    [...ctx.template.skills, ...ctx.template.tools, ...ctx.template.projects, ...ctx.template.strongPaths, ...ctx.template.vulnerablePaths].map(([t]) => t.toLowerCase())
  );
  const mine = [...value.skills, ...value.aiTools, ...value.projects, ...value.strongPaths, ...value.vulnerablePaths].map((i) => i.title.toLowerCase());
  const copied = mine.filter((t) => templateTitles.has(t)).length;
  if (mine.length && copied / mine.length > 0.5) errors.push(`copied the example: ${copied} of ${mine.length} titles are identical to the template`);

  return errors.length ? { ok: false, errors } : { ok: true, errors: [], value };
}
