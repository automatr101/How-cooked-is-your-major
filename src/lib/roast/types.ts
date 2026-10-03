// Types and tier shorthands for the roast engine.
// To add content, see the "HOW TO ADD ROASTS" notes at the top of templates.ts.

/** How cooked the result is. Drives the tone of the roast. */
export type Tier = "low" | "mid" | "high" | "extreme";

/** Broad families of majors, used when a major has no specific discipline. */
export type GroupId = "stem" | "health" | "commerce" | "arts" | "people";

export type DisciplineId =
  | "cs"
  | "engineering"
  | "built"
  | "accounting"
  | "business"
  | "economics"
  | "law"
  | "medicine"
  | "health"
  | "psychology"
  | "science"
  | "math"
  | "education"
  | "creative"
  | "media"
  | "humanities"
  | "social"
  | "agriculture"
  | "hospitality";

/** A roast structure. `text` may contain {tokens} (see engine.ts). */
export interface Template {
  id: string;
  cat: string;
  text: string;
  /** Only used for these tiers. Omit for "any tier". */
  tiers?: Tier[];
  /** Only used when the major matches this discipline. */
  disc?: DisciplineId;
  /** Only used when the major belongs to this group. */
  group?: GroupId;
  /** Uses {d.*} tokens, so it needs a matched discipline. */
  needsDisc?: boolean;
}

/** The pools a discipline supplies for {d.*} tokens. All plain strings. */
export interface DisciplinePools {
  /** plural people noun: "CS majors", "law students" */
  people: string[];
  /** plural job titles: "junior developers" */
  jobs: string[];
  /** a noun phrase for the daily grind: "debugging at 3am" */
  grind: string[];
  /** a tool or product: "Excel" */
  tool: string[];
  /** a noun phrase for a pain: "a merge conflict" */
  pain: string[];
}

export interface Discipline {
  id: DisciplineId;
  group: GroupId;
  /** Matched against the lowercased core name, then the lowercased full name. */
  match: RegExp;
  pools: DisciplinePools;
  /** Complete, hand-written roasts for this discipline. */
  roasts: Array<{ text: string; tiers?: Tier[] }>;
}

export interface RoastInput {
  name: string;
  /** 0-100 */
  score: number;
}

export type Layer = "major" | "group" | "tier" | "general" | "internet";

export interface Roast {
  text: string;
  category: string;
  /** Which fallback layer produced it. */
  layer: Layer;
  tier: Tier;
  discipline?: DisciplineId;
}

// Tier shorthands used when writing content.
export const LOW: Tier[] = ["low"];
export const MID: Tier[] = ["mid"];
export const LM: Tier[] = ["low", "mid"];
export const MH: Tier[] = ["mid", "high"];
export const HX: Tier[] = ["high", "extreme"];
export const EXTREME: Tier[] = ["extreme"];
/** Anything but "low": the result is at least somewhat cooked. */
export const COOKED: Tier[] = ["mid", "high", "extreme"];
