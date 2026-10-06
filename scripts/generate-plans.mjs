// Writes the major-specific parts of the paid career plan ahead of time, using free OpenRouter models.
//
//   npm run plans:models                     list the free models OpenRouter offers right now (no key needed)
//   npm run plans:pilot -- --models a,b      try each model on the same 20 majors; writes .plan-pilot/REPORT.md
//   npm run plans:generate -- --top 100      write plans for the 100 shortest-named (most common) majors not done yet
//   npm run plans:generate                   ...all majors not done yet (stops politely when limits run out)
//   npm run plans:check                      re-check every saved plan and show coverage
//
// Options: --models a,b,c   --top N   --order short|score|name|random (default short)   --slugs x,y   --batch N (majors per request, default 1)
//          --delay MS (default 3500)   --attempts N (default 2)   --json-mode   --out FILE
//
// Key:     OPENROUTER_API_KEY in the environment or .env.local (never printed). Models: --models or OPENROUTER_MODELS.
// Output:  src/lib/plan/generated/plans.json (slug -> plan). Safe to stop and restart: finished majors are skipped.
//          Every answer is checked by src/lib/plan/generated-schema.ts; anything that fails is rejected, never saved.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : fallback;
};

const BASE = (process.env.OPENROUTER_BASE ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
const REAL_FILE = "src/lib/plan/generated/plans.json";
const PILOT_DIR = ".plan-pilot";

// ── key and models ──────────────────────────────────────────────────────────
function envFile() {
  try {
    return Object.fromEntries(
      fs.readFileSync(".env.local", "utf8").split(/\r?\n/).filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")])
    );
  } catch {
    return {};
  }
}
const ENV = envFile();
const KEY = process.env.OPENROUTER_API_KEY ?? ENV.OPENROUTER_API_KEY;
const MODELS = (opt("models", process.env.OPENROUTER_MODELS ?? ENV.OPENROUTER_MODELS ?? "")).split(",").map((s) => s.trim()).filter(Boolean);

// ── compile the app's own TypeScript so this script uses the real data, field matching and checks ──
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "plans-"));
fs.writeFileSync(path.join(tmp, "package.json"), '{ "type": "module" }');
const compile = (src, name) => {
  const js = ts
    .transpileModule(fs.readFileSync(src, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } })
    .outputText.replace(/from "\.\/(\w[\w-]*)"/g, 'from "./$1.js"');
  fs.writeFileSync(path.join(tmp, name.replace(/\.ts$/, ".js")), js);
};
for (const f of fs.readdirSync("src/lib/roast")) if (f.endsWith(".ts")) compile(path.join("src/lib/roast", f), f);
compile("src/lib/data.ts", "data.ts");
compile("src/lib/premium.ts", "premium.ts");
compile("src/lib/analytics.ts", "analytics.ts");
compile("src/lib/plan/content.ts", "content.ts");
compile("src/lib/plan/generated-schema.ts", "generated-schema.ts");
const load = (n) => import(pathToFileURL(path.join(tmp, n)).href);
const { majors } = await load("data.js");
const { planTypeFor } = await load("premium.js");
const { slugify } = await load("analytics.js");
const { analyze } = await load("names.js");
const { GROUPS } = await load("content.js");
const { validateGenerated } = await load("generated-schema.js");

const all = majors.map((m) => {
  const info = analyze(m.name);
  const group = info.group ?? "general";
  return { ...m, slug: slugify(m.name), nick: info.nick, group, disc: info.disc, planType: planTypeFor(m.score) };
});
const ctxOf = (m) => ({
  name: m.name,
  nick: m.nick,
  score: m.score,
  template: { skills: GROUPS[m.group].skills, tools: GROUPS[m.group].tools, projects: GROUPS[m.group].projects, strongPaths: GROUPS[m.group].strongPaths, vulnerablePaths: GROUPS[m.group].vulnerablePaths },
});

const readJson = (file, fallback) => { try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; } };
function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const t = `${file}.tmp`;
  fs.writeFileSync(t, JSON.stringify(data, null, 1) + "\n");
  fs.renameSync(t, file);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const modelSlug = (id) => id.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

// ── commands that need no key ───────────────────────────────────────────────
if (flag("list-models")) {
  const res = await fetch(`${BASE}/models`);
  const { data } = await res.json();
  const free = data.filter((m) => m.id.endsWith(":free") || (Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0));
  free.sort((a, b) => (b.context_length ?? 0) - (a.context_length ?? 0));
  console.log(`${free.length} free models right now (largest context first). Free limits and licences change: read each model's page on openrouter.ai before relying on one.\n`);
  for (const m of free) console.log(`${m.id.padEnd(58)} ${String(m.context_length ?? "?").padStart(8)} ctx   ${m.name}`);
  process.exit(0);
}

if (flag("check")) {
  const file = opt("out", REAL_FILE);
  const store = readJson(file, {});
  const bySlug = new Map(all.map((m) => [m.slug, m]));
  let bad = 0;
  for (const [slug, entry] of Object.entries(store)) {
    const m = bySlug.get(slug);
    if (!m) { console.log(`unknown major: ${slug}`); bad++; continue; }
    const r = validateGenerated(entry, ctxOf(m));
    if (!r.ok) { bad++; console.log(`INVALID ${slug}: ${r.errors.slice(0, 3).join("; ")}`); }
  }
  const done = Object.keys(store).length;
  const byModel = {};
  for (const e of Object.values(store)) byModel[e.model] = (byModel[e.model] ?? 0) + 1;
  console.log(`\n${done} of ${all.length} majors have a generated plan (${((done / all.length) * 100).toFixed(1)}%). The other ${all.length - done} use the template.`);
  console.log("by model:", JSON.stringify(byModel));
  console.log(bad ? `${bad} invalid entries` : "all saved entries pass the checks");
  process.exit(bad ? 1 : 0);
}

if (!KEY) {
  console.error("No OPENROUTER_API_KEY. Add it to .env.local (OPENROUTER_API_KEY=...) or set it in the environment. Run `npm run plans:models` to see free models (no key needed).");
  process.exit(1);
}
if (!MODELS.length) {
  console.error("No model chosen. Run `npm run plans:models`, then pass --models id1,id2 (or set OPENROUTER_MODELS in .env.local).");
  process.exit(1);
}

// ── the prompt ──────────────────────────────────────────────────────────────
const TONE = {
  advantage: "The student is in a SAFE field. Be encouraging and ambitious: help them turn a strong position into a lasting lead. Never use negative, fearful or doomy language, and never suggest the field is at risk. Frame the weaker areas as 'areas to watch'.",
  future_proof: "The student is in a field with MIXED exposure. Be balanced and practical: show where AI will reach the work first and how to stay ahead of it.",
  uncooking: "The student is in a field where much routine work is HIGHLY exposed to AI. Be honest but constructive and energising: the aim is to move toward work that needs a person. No fear-mongering, no hopelessness.",
};

function buildPrompt(batch) {
  const list = batch
    .map((m) => {
      const jobs = m.disc?.pools?.jobs?.slice(0, 3).join(", ");
      const tools = m.disc?.pools?.tool?.slice(0, 3).join(", ");
      return `- key "${m.slug}": ${m.name} | AI-risk score ${m.score}/100 | field: ${m.group}${jobs ? ` | typical jobs: ${jobs}` : ""}${tools ? ` | common tools: ${tools}` : ""}\n  tone: ${TONE[m.planType]}`;
    })
    .join("\n");
  const system = "You write career-plan content for university students. You answer with ONE JSON object and nothing else: no explanation, no markdown fences.";
  const user = `Write major-specific career-plan content for each major below. Make it concrete and specific to THAT major and the real work its graduates do, not generic advice that fits any degree.

${list}

Return a JSON object whose keys are the quoted keys above. Each value must have exactly these fields:
{
  "atRisk": [4 short strings: everyday tasks in this field that AI already does well],
  "staysHuman": [4 short strings: tasks in this field that stay human],
  "strongPaths": [4 objects {"title","why"}: career paths that look strong],
  "vulnerablePaths": [3 objects {"title","why"}: roles or tasks to watch or move beyond],
  "skills": [6 objects {"title","why"}: skills to build],
  "aiTools": [6 objects {"title","why"}: real AI or software tools a student in this field should learn, and what for],
  "projects": [4 objects {"title","why"}: portfolio projects that prove ability, described concretely],
  "internship": [4 short strings: practical internship and job-search tactics for this field],
  "positioning": [3 short strings: how to position yourself to employers]
}

Rules:
- "title" is 2 to 8 words, no full stop. "why" is one plain sentence under 200 characters. Other strings are one sentence each.
- Use only plain ASCII text. No markdown, no emoji, no links.
- Do NOT include any statistics, percentages, salaries, dates, or claims like "studies show". Do NOT promise outcomes ("guaranteed", "will definitely").
- Name real, well-known tools and job titles only. If unsure a tool exists, leave it out.
- Every major must get different content from the others. Use the major's own vocabulary.`;
  return [{ role: "system", content: system }, { role: "user", content: user }];
}

// ── talking to OpenRouter ───────────────────────────────────────────────────
class ApiError extends Error {
  constructor(kind, message, extra = {}) { super(message); this.kind = kind; Object.assign(this, extra); }
}

async function chat(model, messages, tokens) {
  const body = { model, messages, temperature: 0.7, max_tokens: tokens };
  if (flag("json-mode")) body.response_format = { type: "json_object" };
  const started = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", "HTTP-Referer": "https://how-cooked-is-your-major.vercel.app", "X-Title": "How Cooked Is Your Major (plan content)" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });
  } catch (e) {
    throw new ApiError("transient", e.name === "TimeoutError" ? "timed out" : "network error");
  }
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  const msg = String(data?.error?.message ?? text.slice(0, 160)).replace(KEY, "***");
  if (res.status === 401 || res.status === 403) throw new ApiError("auth", `HTTP ${res.status}: ${msg}`);
  if (res.status === 402) throw new ApiError("exhausted", `HTTP 402: ${msg}`);
  if (res.status === 429) {
    const daily = /per[- ]day|daily|free-models-per-day|quota/i.test(msg);
    throw new ApiError(daily ? "exhausted" : "rate", `HTTP 429: ${msg}`, { retryAfter: Number(res.headers.get("retry-after")) || 20 });
  }
  if (res.status === 404 || res.status === 400) throw new ApiError("badmodel", `HTTP ${res.status}: ${msg}`);
  if (!res.ok) throw new ApiError("transient", `HTTP ${res.status}: ${msg}`);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) throw new ApiError("empty", "empty answer");
  return { content, ms: Date.now() - started, usage: data.usage ?? {} };
}

/** Pulls the first complete {...} out of a model answer (models sometimes add fences or chatter). */
function extractJson(text) {
  const cleaned = text.replace(/```(?:json)?/gi, "");
  const start = cleaned.indexOf("{");
  if (start < 0) return null;
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (inStr) { if (esc) esc = false; else if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      try { return JSON.parse(cleaned.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

// ── running a set of majors through one or more models ──────────────────────
/**
 * @param work       majors to do
 * @param models     model ids; tried round-robin, a model that is out of quota is skipped
 * @param store      the saved results (mutated and saved after every success)
 * @param file       where to save
 * @param stats      counters for the report
 */
async function run(work, models, store, file, stats, label) {
  const batchSize = Math.max(1, Number(opt("batch", 1)));
  const delay = Number(opt("delay", 3500));
  const maxAttempts = Math.max(1, Number(opt("attempts", 2)));
  const queue = work.map((m) => ({ m, attempts: 0 }));
  const dead = new Map(); // model -> why
  let turn = 0;
  const failures = readJson(`${file}.failures.json`, {});

  const alive = () => models.filter((id) => !dead.has(id));
  while (queue.length) {
    if (!alive().length) { console.log(`\n[${label}] every model is out of quota or unavailable; stopping. Run the same command again later: finished majors are skipped.`); break; }
    const model = alive()[turn++ % alive().length];
    const batch = queue.splice(0, batchSize);
    const s = (stats[model] ??= { requests: 0, ok: 0, invalid: 0, errors: {}, ms: 0, tokens: 0, reasons: {} });
    s.requests++;
    process.stdout.write(`[${label}] ${model} <- ${batch.map((b) => b.m.slug).join(", ").slice(0, 70)} ... `);
    try {
      const { content, ms, usage } = await chat(model, buildPrompt(batch.map((b) => b.m)), 1500 * batch.length + 300);
      s.ms += ms; s.tokens += usage.total_tokens ?? 0;
      const parsed = extractJson(content);
      let okCount = 0;
      for (const item of batch) {
        const raw = parsed && (parsed[item.m.slug] ?? (batch.length === 1 && parsed.skills ? parsed : undefined));
        const r = validateGenerated(raw, ctxOf(item.m));
        if (r.ok) {
          store[item.m.slug] = { ...r.value, model };
          okCount++; s.ok++;
          delete failures[item.m.slug];
        } else {
          s.invalid++;
          for (const e of r.errors.slice(0, 4)) { const k = e.replace(/\[\d+\]/g, "[]").replace(/\d+/g, "N"); s.reasons[k] = (s.reasons[k] ?? 0) + 1; }
          item.attempts++;
          failures[item.m.slug] = { model, errors: r.errors.slice(0, 6) };
          if (item.attempts < maxAttempts) queue.push(item);
        }
      }
      writeJson(file, store);
      writeJson(`${file}.failures.json`, failures);
      console.log(`${okCount}/${batch.length} saved (${(ms / 1000).toFixed(1)}s)`);
    } catch (e) {
      if (!(e instanceof ApiError)) throw e;
      s.errors[e.kind] = (s.errors[e.kind] ?? 0) + 1;
      console.log(`${e.kind}: ${e.message.slice(0, 110)}`);
      for (const item of batch) {
        if (e.kind === "transient" || e.kind === "empty") item.attempts++;
        if (e.kind === "rate") item.rate = (item.rate ?? 0) + 1;
        if (item.attempts < maxAttempts && (item.rate ?? 0) < 8) queue.unshift(item);
      }
      if (e.kind === "auth") { console.error("\nThe key was rejected. Check OPENROUTER_API_KEY."); process.exit(1); }
      if (e.kind === "exhausted" || e.kind === "badmodel") { dead.set(model, e.kind); console.log(`  -> not using ${model} any more this run (${e.kind})`); }
      if (e.kind === "rate") await sleep(Math.min(e.retryAfter, 60) * 1000);
    }
    await sleep(delay);
  }
}

// ── choosing the majors ─────────────────────────────────────────────────────
function pilotSet() {
  // 4 majors per field, spread across the score range, so every field and every plan type is tried
  const targets = [10, 40, 65, 90];
  const picked = [], seen = new Set();
  for (const g of ["stem", "health", "commerce", "arts", "people"]) {
    const pool = all.filter((m) => m.group === g);
    for (const t of targets) {
      const best = pool.filter((m) => !seen.has(m.slug)).sort((a, b) => Math.abs(a.score - t) - Math.abs(b.score - t) || a.name.length - b.name.length)[0];
      if (best) { seen.add(best.slug); picked.push(best); }
    }
  }
  return picked;
}

function orderMajors(list) {
  const order = opt("order", "short");
  const l = [...list];
  if (order === "short") l.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name)); // short names are the common, real degrees
  else if (order === "name") l.sort((a, b) => a.name.localeCompare(b.name));
  else if (order === "random") { let s = 12345; l.sort(() => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296) - 0.5); }
  else l.sort((a, b) => b.score - a.score || a.name.length - b.name.length);
  return l;
}

// ── pilot ───────────────────────────────────────────────────────────────────
if (flag("pilot")) {
  const set = pilotSet();
  console.log(`Pilot: ${set.length} majors x ${MODELS.length} model(s). Results go to ${PILOT_DIR}/ (nothing touches the app).\n`);
  const stats = {}, stores = {};
  for (const model of MODELS) {
    const file = path.join(PILOT_DIR, `${modelSlug(model)}.json`);
    stores[model] = readJson(file, {});
    await run(set.filter((m) => !stores[model][m.slug]), [model], stores[model], file, stats, "pilot");
  }
  // report
  const bySlug = new Map(all.map((m) => [m.slug, m]));
  const titles = (e) => [...e.strongPaths, ...e.skills, ...e.aiTools, ...e.projects].map((i) => i.title.toLowerCase());
  const jacc = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; for (const x of A) if (B.has(x)) i++; return i / (A.size + B.size - i || 1); };
  let md = `# Plan content pilot\n\n${set.length} majors (4 per field, spread from safe to very cooked). Same prompt for every model.\n\n`;
  md += `| model | answered ok | invalid | other errors | avg seconds | titles copied from template | same-field overlap |\n|---|---|---|---|---|---|---|\n`;
  for (const model of MODELS) {
    const store = stores[model], s = stats[model] ?? { requests: 0, ok: 0, invalid: 0, errors: {}, ms: 0 };
    const entries = Object.entries(store).filter(([slug]) => set.some((m) => m.slug === slug));
    let copied = 0, total = 0;
    for (const [slug, e] of entries) {
      const m = bySlug.get(slug); const tpl = new Set([...GROUPS[m.group].skills, ...GROUPS[m.group].tools, ...GROUPS[m.group].projects, ...GROUPS[m.group].strongPaths].map(([t]) => t.toLowerCase()));
      for (const t of titles(e)) { total++; if (tpl.has(t)) copied++; }
    }
    const overlaps = [];
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) if (bySlug.get(entries[i][0]).group === bySlug.get(entries[j][0]).group) overlaps.push(jacc(titles(entries[i][1]), titles(entries[j][1])));
    const avgOverlap = overlaps.length ? ((overlaps.reduce((a, b) => a + b, 0) / overlaps.length) * 100).toFixed(0) + "%" : "n/a";
    md += `| ${model} | ${entries.length}/${set.length} | ${s.invalid} | ${JSON.stringify(s.errors)} | ${s.ok ? (s.ms / s.ok / 1000).toFixed(1) : "n/a"} | ${total ? ((copied / total) * 100).toFixed(0) + "%" : "n/a"} | ${avgOverlap} |\n`;
  }
  md += `\n(Lower is better for "copied from template" and "same-field overlap": they mean the model wrote its own content, different for each major.)\n\n## Why answers were rejected\n\n`;
  for (const model of MODELS) {
    const r = Object.entries(stats[model]?.reasons ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    md += `**${model}**: ${r.length ? r.map(([k, n]) => `${k} (${n})`).join("; ") : "nothing rejected"}\n\n`;
  }
  md += `## Read these side by side\n\n`;
  for (const slug of ["nursing", ...set.filter((m) => m.group === "stem" && m.score > 60).slice(0, 1).map((m) => m.slug), ...set.filter((m) => m.group === "arts").slice(0, 1).map((m) => m.slug)]) {
    const m = bySlug.get(slug); if (!m) continue;
    md += `### ${m.name} (${m.score}%, ${m.planType})\n\n`;
    for (const model of MODELS) {
      const e = stores[model][slug];
      md += `**${model}**\n` + (e ? `- Paths: ${e.strongPaths.map((i) => i.title).join("; ")}\n- Skills: ${e.skills.map((i) => i.title).join("; ")}\n- Tools: ${e.aiTools.map((i) => i.title).join("; ")}\n- Projects: ${e.projects.map((i) => i.title).join("; ")}\n- Example sentence: ${e.projects[0].why}\n\n` : `(no valid answer)\n\n`);
    }
  }
  fs.mkdirSync(PILOT_DIR, { recursive: true });
  fs.writeFileSync(path.join(PILOT_DIR, "REPORT.md"), md);
  console.log(`\nReport: ${PILOT_DIR}/REPORT.md`);
  process.exit(0);
}

// ── the real run ────────────────────────────────────────────────────────────
const file = opt("out", REAL_FILE);
const store = readJson(file, {});
let work = all.filter((m) => !store[m.slug]);
const only = opt("slugs", "");
if (only) work = work.filter((m) => only.split(",").includes(m.slug));
work = orderMajors(work);
const top = Number(opt("top", 0));
if (top) work = work.slice(0, top);
console.log(`${Object.keys(store).length} already done. Writing ${work.length} more with ${MODELS.length} model(s): ${MODELS.join(", ")}\n`);
const stats = {};
await run(work, MODELS, store, file, stats, "plans");
const done = Object.keys(store).length;
console.log(`\nDone for now: ${done} of ${all.length} majors have a generated plan (${all.length - done} still use the template).`);
for (const [m, s] of Object.entries(stats)) console.log(`  ${m}: ${s.ok} saved, ${s.invalid} rejected, errors ${JSON.stringify(s.errors)}`);
