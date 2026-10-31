import { realMajors, type Major } from "@/lib/data";
import { seeded, shuffled } from "./daily";

// Major Wars: each day two real degrees face off and everyone votes for the one they think is more cooked. The scan's own
// scores are the "answer", shown after the vote next to what the crowd picked.

// Same plain-names pool as the Cooked or Cap? duels
const POOL = realMajors.filter((m) => !/[.(]/.test(m.name) && m.name.length <= 24);

/** Fewest votes before the crowd's split is shown. Below this a percentage is noise, so nothing is shown. */
export const MIN_VOTES_TO_SHOW = 10;

/** Today's two degrees, the same for everyone and for the server. The scores are at least 10 points apart, so there is a clear scan answer. */
export function matchup(day: number): [Major, Major] {
  const rand = seeded(day * 104729 + 7);
  const pick = shuffled(POOL, rand);
  const a = pick[0];
  const b = pick.slice(1).find((m) => Math.abs(m.score - a.score) >= 10) ?? pick[1];
  return rand() < 0.5 ? [a, b] : [b, a];
}

/** 0 or 1: which of the matchup the scan says is more cooked. */
export const scanPick = (pair: [Major, Major]): 0 | 1 => (pair[0].score >= pair[1].score ? 0 : 1);
