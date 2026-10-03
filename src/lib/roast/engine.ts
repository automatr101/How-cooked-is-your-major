import { DISCIPLINES } from "./disciplines";
import { analyze } from "./names";
import {
  AI_CODE,
  AI_DOC,
  AI_GENERAL,
  AI_IMAGE,
  AI_SEARCH,
  OPENERS,
  OPENER_STARTS,
  PUNCH,
  TAILS,
  aiKey,
} from "./pools";
import { TEMPLATES } from "./templates";
import { hash } from "./util";
import type { DisciplineId, DisciplinePools, Layer, Roast, RoastInput, Template, Tier } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// How a roast is made
//
//  1. The cooked score picks a TIER (low / mid / high / extreme), which sets the tone.
//  2. The major's name is analysed: a short "nick" for jokes, a DISCIPLINE (cs, law, ...)
//     and a broader GROUP when there is no specific discipline.
//  3. Every template valid for that tier + discipline + group becomes a candidate. That is
//     the layered fallback: discipline roasts (LEVEL 1), group roasts (LEVEL 2), tier roasts
//     (LEVEL 3), general student/career lines (LEVEL 4), internet/absurd lines (LEVEL 5).
//     Levels 3-5 always exist, so even an obscure major always gets a roast.
//  4. A CATEGORY is picked first (weighted, skipping the last few used), then a template
//     inside it (skipping recently shown ones). This is what keeps consecutive roasts varied.
//  5. {tokens} are filled in. AI names avoid recently used ones, and two AI tokens in one
//     roast never match. Optional slang opener and emoji tail are layered on.
//  6. Too long, unresolved or recently shown? Reject and try again.
// ═══════════════════════════════════════════════════════════════════════════

/** The result card clips at about 150 characters on larger screens. */
export const MAX_CHARS = 150;

const MEMORY_KEY = "cm_roast_memory_v1";
const REMEMBER_IDS = 45; // templates not repeated until this many others have been shown
const AVOID_CATEGORIES = 2; // the last N categories are skipped when anything else is available
const AVOID_AIS = 4; // the last N AI names are skipped when picking a new one
const REMEMBER_TEXTS = 25;
// Longer lines are already a mouthful, so they don't get a slang opener or an emoji tail.
const MAX_FOR_OPENER = 92;
const MAX_FOR_TAIL = 118;

/** Category weights. Anything not listed counts as 1. */
export const CATEGORY_WEIGHT: Record<string, number> = {
  major: 10, // hand-written discipline roasts: roughly 1 in 5 when the major is recognised
  hybrid: 5,
  group: 3,
  tier: 1.2,
  ai_replace: 0.9,
  ai_assist: 0.7,
  ai_vs_human: 0.7,
  ai_student: 0.8,
  ai_resume: 0.7,
  ai_models: 0.8,
  ai_advice: 0.7,
  assignment: 0.9,
  professor: 0.9,
  fyp: 0.8,
};

const FALLBACKS = [
  "this one is too powerful for the roast machine. enjoy the silence.",
  "the roast engine just shrugged. that's honestly worse.",
  "no notes. which is the most savage note there is.",
  "we had a roast ready but it asked for a day off.",
];

export interface SessionOptions {
  /** Random source in [0, 1). Pass a seeded one for repeatable tests. */
  rng?: () => number;
  /** Keep the memory of recent roasts in sessionStorage (browser only). Default true. */
  persist?: boolean;
}

export interface RoastSession {
  roll(major: RoastInput): Roast;
  /** Forget what has been shown so far. */
  reset(): void;
}

interface Memory {
  ids: string[];
  cats: string[];
  ais: string[];
  texts: string[];
}

export function tierOf(score: number): Tier {
  if (score <= 40) return "low";
  if (score <= 60) return "mid";
  if (score <= 80) return "high";
  return "extreme";
}

// Which discipline-pool keys a template needs, e.g. "{d.grind}" -> "grind".
const DISC_POOL_KEYS: Array<keyof DisciplinePools> = ["people", "jobs", "grind", "tool", "pain"];

interface Candidate {
  tpl: Template;
  layer: Layer;
}

// Everything the engine can pick from: the general templates plus every discipline's own roasts.
const ALL_CANDIDATES: Candidate[] = [
  ...TEMPLATES.map((tpl) => ({ tpl, layer: layerOf(tpl) })),
  ...DISCIPLINES.flatMap((d) =>
    d.roasts.map((r) => ({
      tpl: {
        id: `major:${d.id}:${hash(r.text)}`,
        cat: "major",
        text: r.text,
        tiers: r.tiers,
        disc: d.id as DisciplineId,
      } as Template,
      layer: "major" as Layer,
    }))
  ),
];

function layerOf(tpl: Template): Layer {
  if (tpl.disc) return "major";
  if (tpl.group || tpl.needsDisc) return "group";
  if (tpl.cat === "tier") return "tier";
  if (tpl.cat === "absurd" || tpl.cat === "internet") return "internet";
  return "general";
}

function pick<T>(items: readonly T[], rng: () => number): T {
  return items[Math.floor(rng() * items.length)];
}

function pickWeighted<T>(items: readonly T[], weight: (t: T) => number, rng: () => number): T {
  const total = items.reduce((sum, t) => sum + weight(t), 0);
  let r = rng() * total;
  for (const item of items) {
    r -= weight(item);
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

export function createRoastSession(options: SessionOptions = {}): RoastSession {
  const rng = options.rng ?? Math.random;
  const persist = options.persist ?? true;
  let memory: Memory = loadMemory(persist);

  function remember(c: Candidate, text: string, ais: string[]) {
    memory.ids = [c.tpl.id, ...memory.ids].slice(0, REMEMBER_IDS);
    memory.cats = [c.tpl.cat, ...memory.cats].slice(0, 6);
    memory.ais = [...ais.map(aiKey), ...memory.ais].slice(0, 12);
    memory.texts = [text, ...memory.texts].slice(0, REMEMBER_TEXTS);
    saveMemory(persist, memory);
  }

  function roll(major: RoastInput): Roast {
    const tier = tierOf(major.score);
    const info = analyze(major.name);
    const group = info.group;

    const valid = ALL_CANDIDATES.filter(({ tpl }) => {
      if (tpl.tiers && !tpl.tiers.includes(tier)) return false;
      if (tpl.disc && tpl.disc !== info.disc?.id) return false;
      if (tpl.group && tpl.group !== group) return false;
      if (tpl.needsDisc && !info.disc) return false;
      return true;
    });

    const rejected = new Set<string>();
    for (let attempt = 0; attempt < 14; attempt++) {
      const c = choose(valid, rejected, memory, rng);
      if (!c) break;
      const rendered = render(c.tpl, { tier, score: major.score, nick: info.nick, pools: info.disc?.pools ?? null }, memory, rng);
      if (!rendered || rendered.text.length > MAX_CHARS || memory.texts.includes(rendered.text)) {
        rejected.add(c.tpl.id);
        continue;
      }
      remember(c, rendered.text, rendered.ais);
      return { text: rendered.text, category: c.tpl.cat, layer: c.layer, tier, discipline: info.disc?.id };
    }

    // Everything was rejected (should not happen): never leave the user without a roast.
    const text = pick(FALLBACKS, rng);
    return { text, category: "fallback", layer: "internet", tier, discipline: info.disc?.id };
  }

  return {
    roll,
    reset() {
      memory = { ids: [], cats: [], ais: [], texts: [] };
      saveMemory(persist, memory);
    },
  };
}

function choose(valid: Candidate[], rejected: Set<string>, memory: Memory, rng: () => number): Candidate | null {
  let pool = valid.filter((c) => !rejected.has(c.tpl.id) && !memory.ids.includes(c.tpl.id));
  if (pool.length === 0) pool = valid.filter((c) => !rejected.has(c.tpl.id)); // everything was recent: allow repeats
  if (pool.length === 0) return null;

  const byCat = new Map<string, Candidate[]>();
  for (const c of pool) {
    const list = byCat.get(c.tpl.cat);
    if (list) list.push(c);
    else byCat.set(c.tpl.cat, [c]);
  }

  let cats = [...byCat.keys()];
  const recent = new Set(memory.cats.slice(0, AVOID_CATEGORIES));
  const fresh = cats.filter((cat) => !recent.has(cat));
  if (fresh.length > 0) cats = fresh;

  const cat = pickWeighted(cats, (name) => CATEGORY_WEIGHT[name] ?? 1, rng);
  return pick(byCat.get(cat)!, rng);
}

interface RenderContext {
  tier: Tier;
  score: number;
  nick: string;
  pools: DisciplinePools | null;
}

function render(
  tpl: Template,
  ctx: RenderContext,
  memory: Memory,
  rng: () => number
): { text: string; ais: string[] } | null {
  const filled = new Map<string, string>();
  const usedAis: string[] = [];
  let failed = false;

  const pickAi = (pool: string[]): string => {
    const taken = new Set(usedAis.map(aiKey));
    const free = pool.filter((n) => !taken.has(aiKey(n)));
    const candidates = free.length > 0 ? free : [...pool];
    // Avoid the last few names, relaxing step by step so even a small pool never repeats
    // the model used in the previous roast.
    let options = candidates;
    for (const window of [AVOID_AIS, 2, 1]) {
      const recent = new Set(memory.ais.slice(0, window));
      const fresh = candidates.filter((n) => !recent.has(aiKey(n)));
      if (fresh.length > 0) {
        options = fresh;
        break;
      }
    }
    const choice = pick(options, rng);
    usedAis.push(choice);
    return choice;
  };

  const resolve = (key: string): string => {
    switch (key) {
      case "major":
        return ctx.nick;
      case "pct":
        return String(ctx.score);
      case "punch":
        return pick(PUNCH[ctx.tier], rng);
      case "ai":
      case "ai2":
      case "ai3":
        return pickAi(AI_GENERAL);
      case "aiCode":
        return pickAi(AI_CODE);
      case "aiSearch":
        return pickAi(AI_SEARCH);
      case "aiImg":
        return pickAi(AI_IMAGE);
      case "aiDoc":
        return pickAi(AI_DOC);
    }
    const range = key.match(/^#(\d+)-(\d+)$/);
    if (range) {
      const lo = Number(range[1]);
      const hi = Number(range[2]);
      return String(lo + Math.floor(rng() * (hi - lo + 1)));
    }
    const d = key.match(/^d\.(\w+)$/);
    if (d && ctx.pools && (DISC_POOL_KEYS as string[]).includes(d[1])) {
      return pick(ctx.pools[d[1] as keyof DisciplinePools], rng);
    }
    failed = true;
    return "";
  };

  // The same token twice in one roast keeps the same value ({ai} ... {ai}); numbers vary.
  let text = tpl.text.replace(/\{([^}]+)\}/g, (_match, key: string) => {
    if (key.startsWith("#")) return resolve(key);
    const known = filled.get(key);
    if (known !== undefined) return known;
    const value = resolve(key);
    filled.set(key, value);
    return value;
  });
  if (failed || /[{}]/.test(text)) return null;

  text = withFlavour(text, ctx.tier, rng);
  return { text: text.replace(/\s{2,}/g, " ").trim(), ais: usedAis };
}

/** True when the text ends in an emoji. Uses code points so the source stays plain ASCII. */
function endsWithEmojiChar(text: string): boolean {
  const chars = Array.from(text.trimEnd());
  let last = chars.pop();
  if (last && last.codePointAt(0) === 0xfe0f) last = chars.pop(); // skip the emoji variation selector
  const cp = last?.codePointAt(0) ?? 0;
  return (cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x2600 && cp <= 0x27bf);
}

// Optional slang opener (about 1 in 4) and emoji tail (about 2 in 5). Never forced.
function withFlavour(text: string, tier: Tier, rng: () => number): string {
  let out = text;
  const startsLikeOpener = OPENER_STARTS.test(out) || /^["'(\d]/.test(out);
  if (!startsLikeOpener && out.length <= MAX_FOR_OPENER && rng() < 0.25) out = `${pick(OPENERS, rng)} ${out}`;
  const endsWithEmoji = endsWithEmojiChar(out);
  if (!endsWithEmoji && !/[?]$/.test(out) && out.length <= MAX_FOR_TAIL && rng() < 0.4) out = `${out} ${pick(TAILS[tier], rng)}`;
  return out;
}

// ── Session memory (so a visitor doesn't see the same roast twice in a row) ───────────

function loadMemory(persist: boolean): Memory {
  const empty: Memory = { ids: [], cats: [], ais: [], texts: [] };
  if (!persist || typeof sessionStorage === "undefined") return empty;
  try {
    const raw = sessionStorage.getItem(MEMORY_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<Memory>;
    return {
      ids: Array.isArray(parsed.ids) ? parsed.ids.slice(0, REMEMBER_IDS) : [],
      cats: Array.isArray(parsed.cats) ? parsed.cats.slice(0, 6) : [],
      ais: Array.isArray(parsed.ais) ? parsed.ais.slice(0, 12) : [],
      texts: Array.isArray(parsed.texts) ? parsed.texts.slice(0, REMEMBER_TEXTS) : [],
    };
  } catch {
    return empty;
  }
}

function saveMemory(persist: boolean, memory: Memory) {
  if (!persist || typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
  } catch {}
}

let defaultSession: RoastSession | null = null;

/** Roll a roast using the shared per-tab session. */
export function rollRoast(major: RoastInput): Roast {
  defaultSession ??= createRoastSession();
  return defaultSession.roll(major);
}

/** For the content checker: how many roast structures exist. */
export function contentStats() {
  return {
    templates: ALL_CANDIDATES.length,
    categories: new Set(ALL_CANDIDATES.map((c) => c.tpl.cat)).size,
  };
}
