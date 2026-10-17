// Fails if two live (searchable, ranked) majors are the same subject under different names, e.g. "Nursing" and "BSc. Nursing".
// Fix a hit by adding the extra name to ALIASES in src/lib/data.ts (it then resolves to the canonical entry).
// Usage: npm run lint:majors   (Node runs this TypeScript file directly)

import { realMajors } from "../src/lib/data.ts";

const normalize = (name: string): string =>
  name
    .replace(/^(BSc\.?|BA\.?|BFA\.?|B\.Ed\.?|LLB|Bachelor of|Doctor of)\s+/i, "")
    .replace(/\s*\(IT\)$/i, "")
    .replace(/^Administration \((.*)\)$/i, "$1")
    .toLowerCase()
    .replace(/\bsciences\b/g, "science")
    .replace(/cyber security/g, "cybersecurity")
    .trim();

const seen = new Map<string, string>();
let hits = 0;
for (const m of realMajors) {
  const key = normalize(m.name);
  const other = seen.get(key);
  if (other) {
    hits++;
    console.log(`same subject twice: "${other}" and "${m.name}"`);
  } else seen.set(key, m.name);
}
console.log(hits === 0 ? `lint:majors: clean (${realMajors.length} live majors)` : `\nlint:majors: ${hits} duplicate(s)`);
process.exit(hits === 0 ? 0 : 1);
