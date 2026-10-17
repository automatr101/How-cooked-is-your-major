// Fails when user-facing copy contains words or phrases that make the site sound like a consultancy newsletter.
// Usage: npm run lint:copy
//
// This is a STARTER list (taken from the copy audit of 2026-10-17). When /VOICE.md exists, move its banned words into BANNED below.
// It reads the files that hold copy, skips code comments, and skips the legal pages (their wording is checked by a human).
// To allow a hit on purpose, put `lint-copy-ignore` on that line.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const BANNED = [
  "allowing you to", "breakthrough", "emerging", "vectors", "frontier", "top 1%", "high-complexity", "strategic implementation",
  "orchestrat", "leverage", "unlock your potential", "game-changer", "game changer", "delve", "tapestry", "robust", "holistic",
  "empower", "elevate", "foster", "pivotal", "testament", "synergy", "paradigm", "ever-evolving", "cutting-edge", "in today's",
  "navigate the", "landscape", "where the value moves", "10x", "double down", "human empathy", "soft skills", "end-to-end",
];

// Folders and files that hold what visitors read
const INCLUDE = ["src/app", "src/components", "src/content", "src/lib/premium.ts", "src/lib/leads/content.ts", "src/lib/plan", "src/lib/roast"];
const SKIP = [/[\/]privacy[\/]/, /[\/]terms[\/]/, /[\/]refunds[\/]/, /[\/]api[\/]/, /\.md$/, /[\/]ui[\/]/, /[\/]admin[\/]/, /lint-copy/];

function walk(p) {
  const st = statSync(p);
  if (st.isFile()) return /\.(tsx?|mdx?)$/.test(p) ? [p] : [];
  return readdirSync(p).flatMap((f) => walk(join(p, f)));
}

let hits = 0;
for (const inc of INCLUDE) {
  let files = [];
  try {
    files = walk(join(ROOT, inc));
  } catch {
    console.log(`lint:copy: could not read ${inc}`);
    hits++;
    continue;
  }
  for (const file of files) {
    if (SKIP.some((re) => re.test(file))) continue;
    const lines = readFileSync(file, "utf8").split("\n");
    let inBlock = false;
    lines.forEach((line, i) => {
      const t = line.trim();
      if (inBlock) {
        if (t.includes("*/")) inBlock = false;
        return;
      }
      if ((t.startsWith("/*") || t.startsWith("{/*")) && !t.includes("*/")) {
        inBlock = true;
        return;
      }
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*") || t.startsWith("{/*")) return;
      if (line.includes("lint-copy-ignore")) return;
      const code = line.replace(/\s\/\/.*$/, ""); // trailing comments
      const low = code.toLowerCase();
      for (const w of BANNED) {
        // Short single words must be whole words ("Elevated" is a risk label, not "elevate"); phrases match anywhere
        const found = /^[a-z]+$/.test(w) ? new RegExp(`\b${w}\b`).test(low) : low.includes(w);
        if (found) {
          hits++;
          console.log(`${relative(ROOT, file)}:${i + 1}  "${w}"  ${t.slice(0, 110)}`);
        }
      }
    });
  }
}
console.log(hits === 0 ? "lint:copy: clean" : `\nlint:copy: ${hits} hit(s)`);
process.exit(hits === 0 ? 0 : 1);
