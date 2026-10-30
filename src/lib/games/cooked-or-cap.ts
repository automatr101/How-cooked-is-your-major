import { realMajors } from "@/lib/data";
import { FACT_QUESTIONS, SITE_FACT_QUESTIONS } from "@/content/games";
import { seeded, shuffled } from "./daily";

export type Question = {
  id: string;
  prompt: string;
  options: string[];
  correct: number;
  reveal: string;
  source?: string;
};

// Plain, recognisable names only (no "BSc." prefixes or long compound titles), so a duel reads like a real question.
const POOL = realMajors.filter((m) => !/[.(]/.test(m.name) && m.name.length <= 24);

/** Today's 10 questions, the same for everyone: 5 degree duels, 3 score claims (both built from the scan data, so the answers can never be wrong), 2 facts with sources. */
export function buildQuiz(day: number): Question[] {
  const rand = seeded(day * 7919 + 13);
  const pick = shuffled(POOL, rand);
  const out: Question[] = [];

  // Duels: two degrees at least 12 points apart
  let i = 0;
  while (out.length < 5 && i + 1 < pick.length) {
    const a = pick[i++];
    const b = pick.slice(i).find((m) => Math.abs(m.score - a.score) >= 12);
    if (!b) break;
    pick.splice(pick.indexOf(b), 1);
    const first = rand() < 0.5 ? a : b;
    const second = first === a ? b : a;
    out.push({
      id: `duel-${out.length}`,
      prompt: "Which degree is more cooked?",
      options: [first.name, second.name],
      correct: first.score > second.score ? 0 : 1,
      reveal: `${first.name} scores ${first.score}, ${second.name} scores ${second.score}. Scan scores, not a verdict on you.`,
    });
  }

  // Score claims: true as written, or with the number moved by 15 to 30 points
  for (let k = 0; k < 3; k++) {
    const m = pick[i++ % pick.length];
    const isTrue = rand() < 0.5;
    const shift = Math.round(15 + rand() * 15) * (m.score > 50 ? -1 : 1);
    const shown = isTrue ? m.score : Math.min(100, Math.max(0, m.score + shift));
    out.push({
      id: `score-${k}`,
      prompt: `True or cap: ${m.name} scores ${shown} on the cooked scale.`,
      options: ["True", "Cap"],
      correct: isTrue ? 0 : 1,
      reveal: `${m.name} scores ${m.score}. Scan score, not a verdict on you.`,
    });
  }

  // Facts: WEF projections (with source) and site facts
  const facts = shuffled(
    [
      ...FACT_QUESTIONS.map((f) => ({ ...f })),
      ...SITE_FACT_QUESTIONS.map((f) => ({ ...f, source: undefined as string | undefined })),
    ],
    rand
  ).slice(0, 2);
  facts.forEach((f, k) =>
    out.push({
      id: `fact-${k}`,
      prompt: `True or cap: ${f.text}`,
      options: ["True", "Cap"],
      correct: f.answer ? 0 : 1,
      reveal: f.why,
      source: f.source,
    })
  );

  return shuffled(out, rand);
}
