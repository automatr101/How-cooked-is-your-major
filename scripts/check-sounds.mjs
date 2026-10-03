// Checks the sound pools in src/lib/sound-pools.ts.   Usage: npm run sound:check
//   - every sound named in a pool exists in public/sounds and is a real MP3
//   - every sound is small and every tier has something to play
//   - picking never repeats a sound within the last two plays when the pool allows it
//   - every sound file in the folder is used by some pool (unused ones are listed, not an error)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const DIR = "public/sounds";
const MAX_KB = 150;

const out = fs.mkdtempSync(path.join(os.tmpdir(), "sound-check-"));
fs.writeFileSync(path.join(out, "package.json"), '{ "type": "module" }');
fs.writeFileSync(
  path.join(out, "sound-pools.js"),
  ts.transpileModule(fs.readFileSync("src/lib/sound-pools.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText
);
const { RESULT_SOUNDS, pickResultSound, soundTierOf } = await import(pathToFileURL(path.join(out, "sound-pools.js")).href);

let failures = 0;
const fail = (m) => { failures++; console.log("  ✗ " + m); };
const ok = (m) => console.log("  ✓ " + m);

console.log("\n1. Files");
const used = new Set(Object.values(RESULT_SOUNDS).flat());
let total = 0;
for (const name of used) {
  const file = path.join(DIR, name + ".mp3");
  if (!fs.existsSync(file)) { fail(`${name}.mp3 is in a pool but missing from ${DIR}`); continue; }
  const buf = fs.readFileSync(file);
  const isMp3 = buf.toString("latin1", 0, 3) === "ID3" || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0);
  total += buf.length;
  if (!isMp3) fail(`${name}.mp3 does not look like an MP3`);
  if (buf.length > MAX_KB * 1024) fail(`${name}.mp3 is ${(buf.length / 1024).toFixed(0)} KB (limit ${MAX_KB} KB)`);
}
if (failures === 0) ok(`${used.size} sounds in pools, all present, real MP3s, each under ${MAX_KB} KB (${(total / 1024).toFixed(0)} KB total)`);
const unused = fs.readdirSync(DIR).filter((f) => !used.has(f.replace(/\.[^.]+$/, "")));
if (unused.length) console.log(`  i not used by any pool: ${unused.join(", ")}`);

console.log("\n2. Pools");
for (const tier of ["low", "mid", "high", "extreme"]) {
  if (!RESULT_SOUNDS[tier]?.length) fail(`tier "${tier}" has no sounds`);
}
const tierCheck = [[0, "low"], [40, "low"], [41, "mid"], [60, "mid"], [61, "high"], [80, "high"], [81, "extreme"], [100, "extreme"]];
for (const [score, want] of tierCheck) if (soundTierOf(score) !== want) fail(`score ${score} should be "${want}", got "${soundTierOf(score)}"`);
if (failures === 0) ok("every tier has sounds and the score bands line up (0-40, 41-60, 61-80, 81-100)");

console.log("\n3. Picking (5,000 simulated scans per tier)");
let seed = 12345;
const rng = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
for (const [tier, score] of [["low", 20], ["mid", 50], ["high", 70], ["extreme", 95]]) {
  const pool = RESULT_SOUNDS[tier];
  const recent = [];
  const counts = {};
  let withinTwo = 0, backToBack = 0;
  for (let i = 0; i < 5000; i++) {
    const pick = pickResultSound(score, recent, rng);
    if (!pool.includes(pick)) fail(`"${pick}" picked for ${tier} but is not in its pool`);
    if (recent[0] === pick) backToBack++;
    if (recent.slice(0, 2).includes(pick)) withinTwo++;
    counts[pick] = (counts[pick] ?? 0) + 1;
    recent.unshift(pick);
    recent.length = Math.min(6, recent.length);
  }
  const spread = pool.map((n) => `${n} ${((100 * (counts[n] ?? 0)) / 5000).toFixed(0)}%`).join(", ");
  console.log(`   ${tier.padEnd(8)} ${spread}`);
  if (pool.length >= 2 && backToBack > 0) fail(`${tier}: the same sound played back to back ${backToBack} times`);
  if (pool.length >= 4 && withinTwo > 0) fail(`${tier}: a sound repeated within two plays ${withinTwo} times`);
  for (const n of pool) if ((counts[n] ?? 0) === 0) fail(`${tier}: "${n}" never gets picked`);
}
if (failures === 0) ok("no back-to-back repeats where there is a choice, and every sound in every pool gets picked");

fs.rmSync(out, { recursive: true, force: true });
console.log(failures === 0 ? "\nAll checks passed.\n" : `\n${failures} problem(s) found.\n`);
process.exit(failures === 0 ? 0 : 1);
