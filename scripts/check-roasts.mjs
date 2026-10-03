// Content lint + simulation for the roast engine.   Usage: npm run roast:check [-- --samples]
//
// 1. Lints every roast structure (known tokens, duplicates, length, banned words).
// 2. Simulates thousands of "Roast Me Again" sessions and checks the rules the product
//    depends on: nothing repeats too soon, categories and AI names rotate, every major gets a
//    roast, nothing is longer than the card can show.
// Exits with a non-zero code if a hard rule is broken.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const SAMPLES = process.argv.includes("--samples");

// ── Compile the TypeScript sources to a temp folder so Node can import them ──
const out = fs.mkdtempSync(path.join(os.tmpdir(), "roast-check-"));
fs.writeFileSync(path.join(out, "package.json"), '{ "type": "module" }');
const compile = (srcFile, name) => {
  const js = ts
    .transpileModule(fs.readFileSync(srcFile, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.replace(/from "\.\/(\w+)"/g, 'from "./$1.js"');
  fs.writeFileSync(path.join(out, name.replace(/\.ts$/, ".js")), js);
};
for (const f of fs.readdirSync("src/lib/roast")) if (f.endsWith(".ts")) compile(path.join("src/lib/roast", f), f);
compile("src/lib/data.ts", "data.ts");

const roast = await import(pathToFileURL(path.join(out, "index.js")).href);
const { majors } = await import(pathToFileURL(path.join(out, "data.js")).href);
const { createRoastSession, TEMPLATES, DISCIPLINES, MAX_CHARS, contentStats, analyze, tierOf } = roast;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.log("  ✗ " + msg);
};
const ok = (msg) => console.log("  ✓ " + msg);

// Seeded random source so a failing run can be reproduced.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ═════════════════════════ 1. CONTENT LINT ═════════════════════════
console.log("\n1. Content lint");
const stats = contentStats();
console.log(`   ${stats.templates} roast structures across ${stats.categories} categories, ${DISCIPLINES.length} disciplines`);

const KNOWN = /^(major|pct|punch|ai|ai2|ai3|aiCode|aiSearch|aiImg|aiDoc|#\d+-\d+|d\.(people|jobs|grind|tool|pain))$/;
const BANNED = ["suicide", "kill yourself", "kys", "rape", "nazi", "stupid", "idiot", "worthless", "loser", "ugly", "retard"];
const all = [...TEMPLATES, ...DISCIPLINES.flatMap((d) => d.roasts.map((r) => ({ ...r, cat: "major", disc: d.id })))];

const seen = new Map();
for (const t of all) {
  for (const [, key] of t.text.matchAll(/\{([^}]*)\}/g)) if (!KNOWN.test(key)) fail(`unknown token {${key}} in: ${t.text}`);
  const stripped = t.text.replace(/\{[^}]*\}/g, "");
  if (/[{}]/.test(stripped)) fail(`stray brace in: ${t.text}`);
  const key = t.text.toLowerCase();
  if (seen.has(key)) fail(`duplicate text: ${t.text}`);
  seen.set(key, true);
  for (const w of BANNED) if (new RegExp(`\\b${w}\\b`, "i").test(t.text)) fail(`banned word "${w}" in: ${t.text}`);
  if (/^your major is .*% cooked because/i.test(t.text)) fail(`generic "your major is X% cooked because" structure: ${t.text}`);
  if (t.text.length > 175) fail(`very long template (${t.text.length} chars): ${t.text}`);
  if (t.tiers?.includes("low") && /\b(it's over|finished|doomed|no hope|charcoal)\b/i.test(t.text)) fail(`negative wording on a LOW-tier line: ${t.text}`);
}
if (failures === 0) ok("all templates have valid tokens, no duplicates, no banned words, sensible lengths");

// Every tier must have plenty to choose from, with and without a discipline.
const perTier = {};
for (const tier of ["low", "mid", "high", "extreme"]) {
  perTier[tier] = all.filter((t) => !t.disc && !t.group && !t.needsDisc && (!t.tiers || t.tiers.includes(tier))).length;
}
console.log("   general lines available per tier:", JSON.stringify(perTier));
for (const [tier, n] of Object.entries(perTier)) if (n < 45) fail(`only ${n} general lines for tier "${tier}"`);
for (const d of DISCIPLINES) {
  const lows = d.roasts.filter((r) => !r.tiers || r.tiers.includes("low")).length;
  const highs = d.roasts.filter((r) => !r.tiers || r.tiers.includes("extreme")).length;
  if (d.roasts.length < 5) fail(`discipline ${d.id} has only ${d.roasts.length} roasts`);
  if (lows < 2) fail(`discipline ${d.id} has only ${lows} line(s) usable at LOW cooked`);
  if (highs < 2) fail(`discipline ${d.id} has only ${highs} line(s) usable at EXTREME cooked`);
}
if (failures === 0) ok("every tier and every discipline has enough variety");

// ═════════════════════════ 2. EVERY MAJOR GETS A ROAST ═════════════════════════
console.log("\n2. All " + majors.length + " majors");
const layers = {};
const discCount = {};
let longest = 0;
let noMatch = [];
for (let i = 0; i < majors.length; i++) {
  const m = majors[i];
  const session = createRoastSession({ rng: mulberry32(1000 + i), persist: false });
  const r = session.roll(m);
  layers[r.layer] = (layers[r.layer] ?? 0) + 1;
  longest = Math.max(longest, r.text.length);
  if (r.category === "fallback") fail(`fallback used for "${m.name}"`);
  if (r.text.length > MAX_CHARS) fail(`roast too long (${r.text.length}) for "${m.name}": ${r.text}`);
  if (/[{}]|undefined|NaN/.test(r.text)) fail(`unresolved text for "${m.name}": ${r.text}`);
  const info = analyze(m.name);
  const key = info.disc?.id ?? (info.group ? `(group:${info.group})` : "(none)");
  discCount[key] = (discCount[key] ?? 0) + 1;
  if (!info.disc) noMatch.push(m.name);
}
console.log("   first-roast layers:", JSON.stringify(layers), "| longest roast:", longest, "chars (card limit ~" + MAX_CHARS + ")");
console.log("   discipline detection:", JSON.stringify(discCount));
if (noMatch.length) console.log(`   ${noMatch.length} majors have no specific discipline (they use group/tier/general lines), e.g.: ${noMatch.slice(0, 6).join(" | ")}`);
if (failures === 0) ok("every major received a roast that fits the card");

// ═════════════════════════ 3. SESSIONS OF "ROAST ME AGAIN" ═════════════════════════
console.log("\n3. Simulated sessions (60 presses each)");
const pick = (name) => majors.find((m) => m.name === name) ?? { name, score: 50 };
const sample = [
  pick("Computer Science"), pick("Nursing"), pick("Accounting"), pick("Law"), pick("Architecture"), pick("Graphic Design"),
  pick("Psychology"), pick("Mathematics"), pick("Education"), pick("Business"),
  pick("Clinical Graphic Design Technology"), pick("International Software Engineering Engineering"),
  pick("BSc. Quantity Surveying and Construction Economics"), pick("Aquaculture & Water Resources"), pick("BFA. Painting and Sculpture"),
  pick("Doctor of Veterinary Medicine"), pick("Packaging"), pick("Marine"),
  // forced scores to cover each tier for the same major
  { name: "Computer Science", score: 8 }, { name: "Computer Science", score: 52 }, { name: "Computer Science", score: 74 }, { name: "Computer Science", score: 97 },
  { name: "Nursing", score: 12 }, { name: "Law", score: 95 },
  // names that match nothing
  { name: "Zzyzx Studies", score: 30 }, { name: "Quantum Basket Weaving", score: 66 }, { name: "Underwater Cheese Management", score: 88 },
];
const PRESSES = 60;
let totalRolls = 0;
const textsSeen = new Set();
const catCount = {};
const layerCount = {};
const aiCount = {};
let aiRolls = 0;
let consecutiveCat = 0;
let consecutiveAi = 0;
let repeatWithinWindow = 0;
let exactTextRepeats = 0;
let ranOutOfMemory = 0;
let maxLen = 0;

for (let s = 0; s < sample.length; s++) {
  for (let seed = 0; seed < 8; seed++) {
    const session = createRoastSession({ rng: mulberry32(s * 7919 + seed * 104729 + 17), persist: false });
    let prevCat = null;
    let prevAis = null;
    const recent = [];
    for (let i = 0; i < PRESSES; i++) {
      const r = session.roll(sample[s]);
      totalRolls++;
      textsSeen.add(r.text);
      catCount[r.category] = (catCount[r.category] ?? 0) + 1;
      layerCount[r.layer] = (layerCount[r.layer] ?? 0) + 1;
      maxLen = Math.max(maxLen, r.text.length);
      if (r.category === "fallback") ranOutOfMemory++;
      if (prevCat && prevCat === r.category) consecutiveCat++;
      prevCat = r.category;
      const ais = [...r.text.matchAll(/ChatGPT|Claude|Gemini|Grok|DeepSeek|Mistral|Llama|Qwen|Perplexity|Copilot|Cursor|Midjourney|NotebookLM/g)].map((m) => m[0].toLowerCase());
      if (ais.length) {
        aiRolls++;
        for (const a of new Set(ais)) aiCount[a] = (aiCount[a] ?? 0) + 1;
        if (prevAis && ais.some((a) => prevAis.includes(a))) consecutiveAi++;
        prevAis = ais;
      }
      // the same visible text twice within the last 25 presses
      if (recent.includes(r.text)) repeatWithinWindow++;
      recent.unshift(r.text);
      if (recent.length > 25) recent.pop();
    }
  }
}
const pct = (n, d) => ((100 * n) / d).toFixed(1) + "%";
console.log(`   ${totalRolls} roasts rolled, ${textsSeen.size} unique texts (${pct(textsSeen.size, totalRolls)}), longest ${maxLen} chars`);
console.log("   layers:", Object.entries(layerCount).map(([k, v]) => `${k} ${pct(v, totalRolls)}`).join(", "));
const topCats = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
console.log("   category share, top 8:", topCats.slice(0, 8).map(([k, v]) => `${k} ${pct(v, totalRolls)}`).join(", "));
console.log("   category share, bottom 4:", topCats.slice(-4).map(([k, v]) => `${k} ${pct(v, totalRolls)}`).join(", "));
console.log(`   AI mentioned in ${pct(aiRolls, totalRolls)} of roasts. share by model:`, Object.entries(aiCount).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, aiRolls)}`).join(", "));

if (repeatWithinWindow === 0) ok("no roast text repeated within 25 presses");
else fail(`${repeatWithinWindow} repeats within a 25-press window`);
if (consecutiveCat === 0) ok("the same category never appeared twice in a row");
else fail(`${consecutiveCat} times the same category appeared twice in a row`);
if (consecutiveAi === 0) ok("the same AI model never appeared in two consecutive AI roasts");
else fail(`${consecutiveAi} times the same AI model repeated in consecutive AI roasts`);
if (ranOutOfMemory === 0) ok("the fallback line was never needed");
else fail(`${ranOutOfMemory} rolls hit the emergency fallback`);
if (maxLen <= MAX_CHARS) ok(`nothing longer than ${MAX_CHARS} characters`);
else fail(`a roast was ${maxLen} characters`);
const aiShares = Object.values(aiCount).map((v) => v / aiRolls);
const dominant = Math.max(...aiShares);
if (Object.keys(aiCount).length >= 12 && dominant < 0.25) ok("AI references are spread across " + Object.keys(aiCount).length + " models; none dominates");
else fail(`AI variety is thin (${Object.keys(aiCount).length} models, top share ${(dominant * 100).toFixed(0)}%)`);
const chatgpt = (aiCount["chatgpt"] ?? 0) / aiRolls;
if (chatgpt < 0.22) ok(`ChatGPT appears in ${(chatgpt * 100).toFixed(0)}% of AI roasts, not in every joke`);
else fail(`ChatGPT is in ${(chatgpt * 100).toFixed(0)}% of AI roasts`);

// Tone check: the first roast for each tier should never read as "you're doomed" at LOW or "you're fine" at EXTREME.
const tierSamples = { low: [], extreme: [] };
for (let i = 0; i < 300; i++) {
  const lowM = majors.filter((m) => tierOf(m.score) === "low")[i % 100];
  const extM = majors.filter((m) => tierOf(m.score) === "extreme")[i % 100];
  tierSamples.low.push(createRoastSession({ rng: mulberry32(i), persist: false }).roll(lowM).text);
  tierSamples.extreme.push(createRoastSession({ rng: mulberry32(i + 5000), persist: false }).roll(extM).text);
}
const doomedAtLow = tierSamples.low.filter((t) => /\b(it's over|so over|finished|charcoal|cooked and|well done|unemployed|no hope)\b/i.test(t));
const fineAtExtreme = tierSamples.extreme.filter((t) => /\b(you're fine|you're good|you'll be fine|barely toasted|room temperature|you're safe)\b/i.test(t));
if (doomedAtLow.length === 0) ok("LOW-cooked results never get doom lines (300 checked)");
else fail(`${doomedAtLow.length} doom lines at LOW, e.g. ${doomedAtLow[0]}`);
if (fineAtExtreme.length === 0) ok("EXTREME-cooked results never get reassurance (300 checked)");
else fail(`${fineAtExtreme.length} reassuring lines at EXTREME, e.g. ${fineAtExtreme[0]}`);

// ═════════════════════════ 4. SAMPLES ═════════════════════════
if (SAMPLES) {
  console.log("\n4. Samples (one fresh session each, 6 presses)");
  for (const [label, m] of [
    ["Computer Science @ 8% (low)", { name: "Computer Science", score: 8 }],
    ["Nursing @ 52% (mid)", { name: "Nursing", score: 52 }],
    ["Accounting @ 74% (high)", { name: "Accounting", score: 74 }],
    ["Graphic Design @ 97% (extreme)", { name: "Graphic Design", score: 97 }],
    ["Quantum Basket Weaving @ 66% (no discipline)", { name: "Quantum Basket Weaving", score: 66 }],
    ["Clinical Graphic Design Technology @ 92%", { name: "Clinical Graphic Design Technology", score: 92 }],
  ]) {
    console.log("\n  " + label);
    const s = createRoastSession({ rng: mulberry32(label.length * 31), persist: false });
    for (let i = 0; i < 6; i++) {
      const r = s.roll(m);
      console.log(`    [${r.category.padEnd(12)}] ${r.text}`);
    }
  }
}

console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} problem(s) found.\n`);
fs.rmSync(out, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
