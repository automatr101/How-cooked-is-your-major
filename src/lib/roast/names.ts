import { DISCIPLINES } from "./disciplines";
import type { Discipline, GroupId } from "./types";

// Turns a major's name into what the roast engine needs:
//   nick  - a short, natural name to drop into a joke (the card clips long roasts)
//   disc  - the matched discipline, if any
//   group - a broad family, used when there is no specific discipline

const MAX_NICK = 28;

// Degree prefixes: "BSc. Nursing", "Bachelor of Dental Surgery", "LLB Law".
const DEGREE = /^(?:bachelor of|doctor of|master of|bsc|ba|beng|btech|msc|bfa|llb)\.?\s+/i;
const MODIFIERS = new Set([
  "advanced", "applied", "clinical", "computational", "digital",
  "global", "international", "strategic", "technical", "industrial",
]);
const SUFFIXES = new Set([
  "engineering", "science", "technology", "management", "studies", "analytics", "policy", "practice",
]);
const CONNECTORS = new Set(["and", "&", "of", "with", "in", "for"]);

function trimConnectors(words: string[]): string[] {
  const w = [...words];
  while (w.length > 1 && CONNECTORS.has(w[w.length - 1].toLowerCase())) w.pop();
  return w;
}

/** "Administration (Banking and Finance)" -> "Banking and Finance"; "Information Technology (IT)" -> "Information Technology". */
function handleParens(name: string): string {
  const m = name.match(/^(.+?)\s*\((.+)\)\s*$/);
  if (!m) return name;
  const [, left, inner] = m;
  return /^administration$/i.test(left.trim()) && inner.length > 4 ? inner.trim() : left.trim();
}

function clean(name: string): string {
  if (/^b\.?ed\b/i.test(name.trim())) return "Education";
  const noDegree = handleParens(name.trim().replace(DEGREE, ""));
  return trimConnectors(noDegree.split(/\s+/)).join(" ");
}

/** Drops one leading modifier and one trailing generic suffix ("Clinical X Technology" -> "X"). */
function core(cleaned: string): string {
  let w = cleaned.split(/\s+/);
  if (w.length > 1 && MODIFIERS.has(w[0].toLowerCase())) w = w.slice(1);
  if (w.length > 1 && SUFFIXES.has(w[w.length - 1].toLowerCase())) w = w.slice(0, -1);
  return trimConnectors(w).join(" "); // "Dairy and Meat Science and Technology" -> "Dairy and Meat Science"
}

function shorten(text: string): string {
  if (text.length <= MAX_NICK) return text;
  const split = text.split(/\s+(?:and|&)\s+/i)[0];
  if (split.length >= 4 && split.length <= MAX_NICK) return split;
  const words = text.split(/\s+/);
  let out = "";
  for (const w of words) {
    if ((out + " " + w).trim().length > MAX_NICK) break;
    out = (out + " " + w).trim();
  }
  return trimConnectors(out.split(/\s+/)).join(" ") || text.slice(0, MAX_NICK);
}

// Used only when no specific discipline matched.
const GROUP_GUESS: Array<[GroupId, RegExp]> = [
  ["health", /health|medic|nurs|care|clinic|therap|pharm/],
  ["stem", /scien|techn|engineer|math|comput|data|stat|geo|bio|chem|phys/],
  ["commerce", /business|admin|manage|financ|econom|market|account|trade|commerce/],
  ["arts", /\bart|design|media|music|film|language|literat|histor|cultur|writ/],
  ["people", /social|psych|educat|law|human|communit|develop|polic|relations/],
];

export interface MajorInfo {
  nick: string;
  disc: Discipline | null;
  group: GroupId | null;
}

export function analyze(name: string): MajorInfo {
  const cleaned = clean(name);
  const coreName = core(cleaned);
  const nick = shorten(cleaned.length <= MAX_NICK ? cleaned : coreName);

  const haystacks = [coreName.toLowerCase(), cleaned.toLowerCase()];
  let disc: Discipline | null = null;
  for (const text of haystacks) {
    disc = DISCIPLINES.find((d) => d.match.test(text)) ?? null;
    if (disc) break;
  }

  let group: GroupId | null = disc?.group ?? null;
  if (!group) {
    const full = cleaned.toLowerCase();
    group = GROUP_GUESS.find(([, re]) => re.test(full))?.[0] ?? null;
  }
  return { nick, disc, group };
}
