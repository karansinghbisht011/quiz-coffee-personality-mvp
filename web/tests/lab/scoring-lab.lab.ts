// The scoring lab (IMPLEMENTATION.md section 4.4). Replays answer combinations through each
// scoring variant and writes test-results/lab/scoring-lab.md. Run: npm run lab
import { describe, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { QUESTIONS } from "@/lib/questions";
import { loadData } from "../helpers";
import { buildProfile, prepare, recommendFromProfile, type Profile } from "./v1";
import { makeEngine, mulberry32, type Opts } from "./engine";

const data = loadData();
const SAMPLE = Number(process.env.LAB_SAMPLE ?? 60000);
const MULTI_PROFILES = 1000;
const MULTI_ROLLS = 25;

// ---- sample of answer combinations (seeded, so every variant sees the same quizzes) ----
const rnd = mulberry32(20261006);
const profiles: Profile[] = [];
for (let i = 0; i < SAMPLE; i++) {
  const chosen = QUESTIONS.map((q) => q.answers[Math.floor(rnd() * 4)].tags);
  profiles.push(buildProfile(chosen));
}

const baselineProfiles: Profile[] = [];
{
  const r = mulberry32(777);
  for (let i = 0; i < 1500; i++) baselineProfiles.push(buildProfile(QUESTIONS.map((q) => q.answers[Math.floor(r() * 4)].tags)));
}
const soft = { band1: 0.97, band2: 0.9, band3: 0.8, coffeeBand: 0.95, tau: 0.08, minCandidates: 8, wildcard: true };
const base: Opts = { capCafe: false, neutralBlank: false, idf: false, alpha: 0, lift: { k1: 0, k2: 0, k3: 0 }, menuPenalty: 0, cafeShare: 0.3, soft: null };
const VARIANTS: { name: string; v1?: true; opts?: Opts }[] = [
  { name: "V1 frozen v1 engine", v1: true },
  { name: "V2 +idea 1 cafe cap and normalise", opts: { ...base, capCafe: true } },
  { name: "V3 +neutral blank (0.5)", opts: { ...base, capCafe: true, neutralBlank: true } },
  { name: "V4 +idea 2 rarity weights", opts: { ...base, capCafe: true, neutralBlank: true, idf: true } },
  { name: "V5 +popularity prior (alpha 0.08) and hash tie-break", opts: { ...base, capCafe: true, neutralBlank: true, idf: true, alpha: 0.08 } },
  { name: "V6 +ideas 3 and 5 soft top-N and slots (full v2)", opts: { ...base, capCafe: true, neutralBlank: true, idf: true, alpha: 0.08, soft } },
];

interface Row { cafe: string; id: number; score: number; slot: number }
type Runner = (p: Profile, seed: number, roll: boolean) => Row[];

function runnerFor(v: (typeof VARIANTS)[number], dat = data): Runner {
  if (v.v1) return (p) => recommendFromProfile(p, dat).map((x, i) => ({ cafe: x.cafeName, id: x.coffee.id, score: x.raw, slot: i + 1 })).map((r, _i, a) => ({ ...r, score: r.score / (a[0].score || 1) }));
  const eng = makeEngine(dat, v.opts!, baselineProfiles);
  return (p, seed, roll) => eng.recommend(p, seed, roll && v.opts!.soft ? mulberry32(seed ^ 0x9e3779b9) : undefined).map((x) => ({ cafe: x.cafe, id: x.coffeeId, score: x.score, slot: x.slot }));
}

const { rows: prepared } = prepare(data);
const eligibleCafes = new Set(prepared.filter((r) => r.dims >= 3).map((r) => r.cafeName)).size;
const eligibleCoffees = prepared.filter((r) => r.dims >= 3).length;

function gini(counts: number[]) {
  const a = [...counts].sort((x, y) => x - y);
  const n = a.length, sum = a.reduce((x, y) => x + y, 0);
  if (!sum) return 0;
  let cum = 0;
  a.forEach((x, i) => (cum += (i + 1) * x));
  return (2 * cum) / (n * sum) - (n + 1) / n;
}

function evaluate(v: (typeof VARIANTS)[number], dat = data) {
  const run = runnerFor(v, dat);
  const cafeQuizzes = new Map<string, number>();
  const cafePicks = new Map<string, number>();
  const coffees = new Set<number>();
  const cafesSeen = new Set<string>();
  const q: Record<number, number[]> = { 1: [], 2: [], 3: [] };
  const t0 = performance.now();
  let calls = 0;
  profiles.forEach((p, i) => {
    const picks = run(p, i + 1, true);
    calls++;
    for (const x of picks) {
      cafePicks.set(x.cafe, (cafePicks.get(x.cafe) ?? 0) + 1);
      cafeQuizzes.set(x.cafe, (cafeQuizzes.get(x.cafe) ?? 0) + 1);
      coffees.add(x.id); cafesSeen.add(x.cafe);
      q[x.slot].push(x.score);
    }
  });
  const ms = (performance.now() - t0) / calls;
  const single = { cafes: cafesSeen.size, coffees: coffees.size };
  // many rolls on a few profiles (random variants): union reachability
  if (v.opts?.soft) {
    for (let i = 0; i < MULTI_PROFILES; i++) {
      const p = profiles[i];
      for (let r = 0; r < MULTI_ROLLS; r++) for (const x of run(p, 1_000_003 * (r + 1) + i, true)) { coffees.add(x.id); cafesSeen.add(x.cafe); }
    }
  }
  const counts = [...cafePicks.values()].sort((a, b) => b - a);
  const total = counts.reduce((a, b) => a + b, 0);
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const min = (a: number[]) => (a.length ? Math.min(...a) : 0);
  const allCafeCounts = [...Object.keys(data.cafes)].map((c) => cafePicks.get(c) ?? 0);
  return {
    name: v.name, quizzes: profiles.length,
    cafes1: single.cafes, coffees1: single.coffees, cafesU: cafesSeen.size, coffeesU: coffees.size,
    topCafe: [...cafeQuizzes.entries()].sort((a, b) => b[1] - a[1])[0],
    topShare: Math.max(...cafeQuizzes.values()) / profiles.length,
    top10: counts.slice(0, 10).reduce((a, b) => a + b, 0) / total,
    gini: gini(allCafeCounts),
    q1: [mean(q[1]), min(q[1])], q2: [mean(q[2]), min(q[2])], q3: [mean(q[3]), min(q[3])], ms,
  };
}

const SWEEP = process.env.LAB_MODE === "sweep";
const full: Opts = { ...base, capCafe: true, neutralBlank: true, idf: true, alpha: 0.08, soft };

const LIFT = process.env.LAB_MODE === "lift";
const SIM = process.env.LAB_MODE === "simfill";
describe("scoring lab (simulated crowd fill)", () => {
  it.runIf(SIM)("estimates how much more crowd tags could help, before spending searches on them", () => {
    const qf: Opts = { ...base, capCafe: true, neutralBlank: true, idf: true, alpha: 0.08, menuPenalty: 0.12, cafeShare: 0.3, soft: { ...soft, tau: 0.16 } };
    const scenarios: [string, number, number][] = [
      ["today (68 of 227 cafes have a crowd tag)", 0, 0],
      ["fill 45% of the 159 blanks, 5% of them lively (what the pilot's committed tags look like)", 0.45, 0.05],
      ["fill 45% of the blanks, 26% lively (same share as today's labelled cafes)", 0.45, 0.26],
      ["fill 80% of the blanks, 25% lively (adding low-confidence leans)", 0.8, 0.25],
      ["fill 100% of the blanks, 26% lively (best case)", 1, 0.26],
      ["fill 100% of the blanks, 50% lively (a lively-heavy best case)", 1, 0.5],
    ];
    const results = scenarios.map(([name, fill, pl]) => {
      const r = mulberry32(4242);
      const d2 = JSON.parse(JSON.stringify(data));
      for (const c of Object.values(d2.cafes) as { crowd: string | null }[]) if (!c.crowd && r() < fill) c.crowd = r() < pl ? "lively" : "quiet";
      return evaluate({ name, opts: qf }, d2);
    });
    const pc = (x: number) => `${(100 * x).toFixed(1)}%`;
    const md = `# Simulated crowd fill (Quality-first settings, ${SAMPLE.toLocaleString("en-IN")} quizzes)

Randomly assigned crowd tags for blank cafes, to estimate the value of the data fix before spending searches. Not real data.

| Scenario | Cafes seen (+rolls) | Coffees seen (+rolls) | Top cafe share | Top-10 share | Gini |
|---|---|---|---|---|---|
${results.map((r) => `| ${r.name} | ${r.cafesU} (${pc(r.cafesU / eligibleCafes)}) | ${r.coffeesU} (${pc(r.coffeesU / eligibleCoffees)}) | ${r.topCafe[0]} ${pc(r.topShare)} | ${pc(r.top10)} | ${r.gini.toFixed(2)} |`).join("\n")}
`;
    mkdirSync(new URL("../../test-results/lab/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../../test-results/lab/scoring-lab-simfill.md", import.meta.url), md);
    console.log(md);
  });
});
describe("scoring lab (lift)", () => {
  it.runIf(LIFT)("tests the baseline-lift idea on top of the best full-v2 setting", () => {
    const b = { ...soft, band1: 0.95, band2: 0.85, band3: 0.7, tau: 0.16 };
    const o: Opts = { ...base, capCafe: true, neutralBlank: true, idf: true, alpha: 0.08, menuPenalty: 0.12, cafeShare: 0.3, soft: b };
    const cfg: [string, { k1: number; k2: number; k3: number }][] = [
      ["no lift (reference)", { k1: 0, k2: 0, k3: 0 }],
      ["lift 0.5 on slot 3", { k1: 0, k2: 0, k3: 0.5 }],
      ["lift 1 on slot 3", { k1: 0, k2: 0, k3: 1 }],
      ["lift 0.5 on slots 2 and 3", { k1: 0, k2: 0.5, k3: 0.5 }],
      ["lift 1 on slots 2 and 3", { k1: 0, k2: 1, k3: 1 }],
      ["lift 0.5 on all slots", { k1: 0.5, k2: 0.5, k3: 0.5 }],
      ["lift 1 on all slots", { k1: 1, k2: 1, k3: 1 }],
      ["lift 1.5 on all slots", { k1: 1.5, k2: 1.5, k3: 1.5 }],
    ];
    const results = cfg.map(([name, lift]) => evaluate({ name, opts: { ...o, lift } }));
    const pc = (x: number) => `${(100 * x).toFixed(1)}%`;
    const f = (x: number) => x.toFixed(2);
    const md = `# Scoring lab: baseline-lift test (${SAMPLE.toLocaleString("en-IN")} quizzes)

Base: gamma 0.3, menu penalty 0.12, bands 0.95/0.85/0.70, tau 0.16, alpha 0.08.

| Setting | Cafes (+rolls) | Coffees (+rolls) | Top cafe share | Top-10 share | Gini | Q1 mean/min | Q2 mean/min | Q3 mean/min |
|---|---|---|---|---|---|---|---|---|
${results.map((r) => `| ${r.name} | ${r.cafesU} (${pc(r.cafesU / eligibleCafes)}) | ${r.coffeesU} (${pc(r.coffeesU / eligibleCoffees)}) | ${r.topCafe[0]} ${pc(r.topShare)} | ${pc(r.top10)} | ${f(r.gini)} | ${f(r.q1[0])}/${f(r.q1[1])} | ${f(r.q2[0])}/${f(r.q2[1])} | ${f(r.q3[0])}/${f(r.q3[1])} |`).join("\n")}
`;
    mkdirSync(new URL("../../test-results/lab/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../../test-results/lab/scoring-lab-lift.md", import.meta.url), md);
    console.log(md);
  });
});

describe("scoring lab", () => {
  it.runIf(SWEEP)("sweeps the full-v2 parameters and writes the sweep report", () => {
    const bandsA = { band1: 0.97, band2: 0.9, band3: 0.8 };
    const bandsB = { band1: 0.95, band2: 0.85, band3: 0.7 };
    const grid: { name: string; opts: Opts }[] = [];
    for (const cafeShare of [0.15, 0.3])
      for (const menuPenalty of [0, 0.12, 0.25])
        for (const [bn, b] of [["A", bandsA], ["B", bandsB]] as const)
          for (const tau of [0.08, 0.16])
            grid.push({ name: `gamma ${cafeShare} | menu ${menuPenalty} | bands ${bn} | tau ${tau}`, opts: { ...full, cafeShare, menuPenalty, soft: { ...soft, ...b, tau } } });
    const results = grid.map((g) => evaluate({ name: g.name, opts: g.opts }));
    const pc = (x: number) => `${(100 * x).toFixed(1)}%`;
    const f = (x: number) => x.toFixed(2);
    const md = `# Scoring lab sweep (full v2, ${SAMPLE.toLocaleString("en-IN")} quizzes)

| Setting | Cafes (+rolls) | Coffees (+rolls) | Top cafe share | Top-10 share | Gini | Q1 mean/min | Q2 mean/min | Q3 mean/min |
|---|---|---|---|---|---|---|---|---|
${results.map((r) => `| ${r.name} | ${r.cafesU} (${pc(r.cafesU / eligibleCafes)}) | ${r.coffeesU} (${pc(r.coffeesU / eligibleCoffees)}) | ${r.topCafe[0]} ${pc(r.topShare)} | ${pc(r.top10)} | ${f(r.gini)} | ${f(r.q1[0])}/${f(r.q1[1])} | ${f(r.q2[0])}/${f(r.q2[1])} | ${f(r.q3[0])}/${f(r.q3[1])} |`).join("\n")}
`;
    mkdirSync(new URL("../../test-results/lab/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../../test-results/lab/scoring-lab-sweep.md", import.meta.url), md);
    console.log(md);
  });

  it.runIf(!SWEEP && !LIFT && !SIM)("compares the variants and writes the report", () => {
    const results = VARIANTS.map((v) => evaluate(v));
    const pc = (x: number) => `${(100 * x).toFixed(1)}%`;
    const f = (x: number) => x.toFixed(2);
    const md = `# Scoring lab report

Generated by \`tests/lab/scoring-lab.lab.ts\` (npm run lab). Sample: ${SAMPLE.toLocaleString("en-IN")} random answer combinations (seeded, the same for every variant) out of 262,144; one random roll each for random variants, plus ${MULTI_PROFILES} profiles x ${MULTI_ROLLS} rolls for the union columns. Denominators: ${eligibleCafes} cafes and ${eligibleCoffees} coffees are eligible (at least 3 of 6 coffee dimensions filled). Reachability on a sample understates the full run for deterministic variants; the final engine is run on all 262,144 in the coverage test.

| Variant | Cafes seen (sample) | Coffees seen (sample) | Cafes seen (+rolls) | Coffees seen (+rolls) | Top cafe share of quizzes | Top-10 cafes' share of picks | Gini (0 = even) | Slot 1 quality mean / min | Slot 2 | Slot 3 | ms per quiz |
|---|---|---|---|---|---|---|---|---|---|---|---|
${results.map((r) => `| ${r.name} | ${r.cafes1} (${pc(r.cafes1 / eligibleCafes)}) | ${r.coffees1} (${pc(r.coffees1 / eligibleCoffees)}) | ${r.cafesU} | ${r.coffeesU} (${pc(r.coffeesU / eligibleCoffees)}) | ${r.topCafe[0]} ${pc(r.topShare)} | ${pc(r.top10)} | ${f(r.gini)} | ${f(r.q1[0])} / ${f(r.q1[1])} | ${f(r.q2[0])} / ${f(r.q2[1])} | ${f(r.q3[0])} / ${f(r.q3[1])} | ${r.ms.toFixed(2)} |`).join("\n")}

Quality = the pick's score as a share of the best coffee's score for that profile, in each variant's own scoring (so it is comparable across slots, not across scoring formulas). V1 quality is raw score over the top pick's raw score.
`;
    mkdirSync(new URL("../../test-results/lab/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../../test-results/lab/scoring-lab.md", import.meta.url), md);
    console.log(md);
  });
});
