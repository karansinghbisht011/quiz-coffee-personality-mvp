// Scoring v2 (specs/scoring-spec.md section 8; why: IMPLEMENTATION.md section 4).
// Plain functions, no React. The frozen v1 engine lives in tests/lab/v1.ts.
import { SCORING as C, SLOT_LABELS } from "./scoring-config";
import { mulberry32 } from "./rng";

export interface Cafe {
  maps_link: string;
  type: string;
  popularity_rank: number | null;
  vibe: string[];
  crowd: string | null;
  setting: string | null;
}

export interface Coffee {
  id: number;
  cafe: string;
  name: string;
  strength: string | null;
  sweetness: string | null;
  milk: string | null;
  temperature: string | null; // 13 rows hold "hot|iced"
  flavour: string[];
  adventurousness: string | null;
}

export interface QuizData {
  cafes: Record<string, Cafe>;
  coffees: Coffee[];
}

export type Slot = 1 | 2 | 3;

export interface Pick {
  slot: Slot;
  label: (typeof SLOT_LABELS)[Slot];
  coffee: Coffee;
  cafeName: string;
  cafe: Cafe;
  /** The coffee's v2 score. */
  score: number;
  /** score divided by the best score of any coffee for this profile (1 = the very best match). */
  quality: number;
  coffeeTags: string[]; // matched coffee tag values, in reason order
  cafeTags: string[]; // matched cafe tag values, in reason order
  reason: string;
}

export interface RecommendOptions {
  /** Seeded random source. Without it the engine is deterministic (top of each band). */
  rng?: () => number;
  /** Seed for the hash tie-break (use makeSeed(letters, roll)). */
  seed?: number;
}

// Dimension order is also the reason-line order (spec section 6).
export const COFFEE_DIMS = ["strength", "sweetness", "milk", "temperature", "flavour", "adventurousness"] as const;
export const CAFE_DIMS = ["vibe", "setting", "crowd"] as const;

// Quiz word -> dimension (spec section 2). Each word belongs to exactly one dimension.
export const WORD_DIM: Record<string, string> = {
  strong: "strength", mild: "strength", medium: "strength",
  milk: "milk", black: "milk", "plant milk": "milk",
  sweet: "sweetness", dessert: "sweetness", none: "sweetness", light: "sweetness",
  hot: "temperature", iced: "temperature",
  caramel: "flavour", fruity: "flavour", spiced: "flavour", classic: "flavour", chocolate: "flavour", nutty: "flavour",
  familiar: "adventurousness", curious: "adventurousness", bold: "adventurousness",
  cozy: "vibe", social: "vibe", "work-friendly": "vibe", aesthetic: "vibe", "quick stop": "vibe",
  quiet: "crowd", lively: "crowd",
  chain: "setting", "pub or brewery": "setting",
};

const key = (dim: string, value: string) => `${dim}:${value}`;
const split = (v: string | null) => (v ? v.split("|").filter(Boolean) : []);
const isCoffeeDim = (d: string) => (COFFEE_DIMS as readonly string[]).includes(d);

export type Profile = Record<string, number>;

/** chosen: the tag words of each chosen answer. First tag +2, the rest +1. */
export function buildProfile(chosen: string[][]): Profile {
  const profile: Profile = {};
  for (const tags of chosen) {
    tags.forEach((word, i) => {
      const dim = WORD_DIM[word];
      if (!dim) throw new Error(`Unmapped quiz word: ${word}`);
      profile[key(dim, word)] = (profile[key(dim, word)] ?? 0) + (i === 0 ? 2 : 1);
    });
  }
  return profile;
}

/** The (dimension, value) tags a coffee carries. */
export function coffeeTags(c: Coffee): [string, string][] {
  const out: [string, string][] = [];
  for (const v of split(c.strength)) out.push(["strength", v]);
  for (const v of split(c.sweetness)) out.push(["sweetness", v]);
  for (const v of split(c.milk)) out.push(["milk", v]);
  for (const v of split(c.temperature)) out.push(["temperature", v]);
  for (const v of c.flavour) out.push(["flavour", v]);
  for (const v of split(c.adventurousness)) out.push(["adventurousness", v]);
  return out;
}

export function cafeTags(cafe: Cafe): [string, string][] {
  const out: [string, string][] = [];
  for (const v of cafe.vibe) out.push(["vibe", v]);
  for (const v of split(cafe.setting)) out.push(["setting", v]);
  for (const v of split(cafe.crowd)) out.push(["crowd", v]);
  return out;
}

// ---------- prepared data (computed once per data object) ----------

type Tag = [dim: string, value: string, key: string];

interface PCafe {
  name: string;
  cafe: Cafe;
  tags: Tag[];
  dims: Set<string>;
  prior: number; // 0..1, 0 when the rank is blank
  menuFactor: number; // 1 - menuPenalty x log-share of the biggest menu
}
interface PRow {
  coffee: Coffee;
  ci: number;
  tags: Tag[];
  dims: number; // coffee dimensions filled
}
export interface Prepared {
  cafes: PCafe[];
  rows: PRow[];
  byCafe: Record<1 | 3, number[][]>; // row indexes per cafe, for the eligibility floor
  coffeeIdf: Map<string, number>;
  cafeIdf: Map<string, number>;
}

function idfTable(counts: Map<string, number>, N: number) {
  const raw = new Map<string, number>();
  for (const [k, n] of counts) raw.set(k, Math.log((N + 1) / (n + 1)));
  const mean = [...raw.values()].reduce((a, b) => a + b, 0) / (raw.size || 1) || 1;
  const out = new Map<string, number>();
  for (const [k, v] of raw) out.set(k, Math.min(C.idfMax, Math.max(C.idfMin, v / mean)));
  return out;
}

const cache = new WeakMap<QuizData, Prepared>();

/** Rarity weights, popularity priors and menu-size factors, computed once. */
export function prepare(data: QuizData): Prepared {
  const hit = cache.get(data);
  if (hit) return hit;
  const names = Object.keys(data.cafes);
  const index = new Map(names.map((n, i) => [n, i]));
  const coffeeCount = new Map<string, number>();
  for (const c of data.coffees) for (const [d, v] of coffeeTags(c)) coffeeCount.set(key(d, v), (coffeeCount.get(key(d, v)) ?? 0) + 1);
  const cafeCount = new Map<string, number>();
  for (const cf of Object.values(data.cafes)) for (const [d, v] of cafeTags(cf)) cafeCount.set(key(d, v), (cafeCount.get(key(d, v)) ?? 0) + 1);
  const menu = new Map<string, number>();
  for (const c of data.coffees) menu.set(c.cafe, (menu.get(c.cafe) ?? 0) + 1);
  const maxMenu = Math.max(1, ...menu.values());
  const maxRank = Math.max(1, ...Object.values(data.cafes).map((c) => c.popularity_rank ?? 0));
  const cafes: PCafe[] = names.map((name) => {
    const cafe = data.cafes[name];
    const tags = cafeTags(cafe).map(([d, v]) => [d, v, key(d, v)] as Tag);
    return {
      name, cafe, tags, dims: new Set(tags.map((t) => t[0])),
      prior: cafe.popularity_rank == null ? 0 : 1 - (cafe.popularity_rank - 1) / maxRank,
      menuFactor: 1 - (C.menuPenalty * Math.log(1 + (menu.get(name) ?? 1))) / Math.log(1 + maxMenu),
    };
  });
  const rows: PRow[] = [];
  for (const coffee of data.coffees) {
    const ci = index.get(coffee.cafe);
    if (ci === undefined) continue;
    const tags = coffeeTags(coffee).map(([d, v]) => [d, v, key(d, v)] as Tag);
    rows.push({ coffee, ci, tags, dims: new Set(tags.map((t) => t[0])).size });
  }
  const byCafe: Prepared["byCafe"] = { 1: cafes.map(() => []), 3: cafes.map(() => []) };
  rows.forEach((r, i) => {
    byCafe[1][r.ci].push(i);
    if (r.dims >= C.minDimensions) byCafe[3][r.ci].push(i);
  });
  const prepared = { cafes, rows, byCafe, coffeeIdf: idfTable(coffeeCount, data.coffees.length), cafeIdf: idfTable(cafeCount, names.length) };
  cache.set(data, prepared);
  return prepared;
}

// ---------- scoring ----------

/** Score of every prepared row for a profile (same order as `prepared.rows`). */
export function scoreRows(profile: Profile, prep: Prepared): Float64Array {
  const pc: Record<string, number> = {};
  const pf: Record<string, number> = {};
  const profMax: Record<string, number> = {};
  let maxCoffee = 0;
  for (const [k, p] of Object.entries(profile)) {
    const d = k.slice(0, k.indexOf(":"));
    if (isCoffeeDim(d)) {
      pc[k] = p * (prep.coffeeIdf.get(k) ?? 1);
      maxCoffee += pc[k];
    } else {
      pf[k] = p * (prep.cafeIdf.get(k) ?? 1);
      profMax[d] = Math.max(profMax[d] ?? 0, pf[k]);
    }
  }
  const asked = CAFE_DIMS.filter((d) => profMax[d] !== undefined);
  const cafeNorm = new Float64Array(prep.cafes.length);
  prep.cafes.forEach((cf, i) => {
    if (!asked.length) return;
    let sum = 0;
    for (const d of asked) {
      if (!cf.dims.has(d)) {
        sum += C.neutralBlank; // no data for this dimension: neutral, not zero
        continue;
      }
      let best = 0;
      for (const t of cf.tags) if (t[0] === d) best = Math.max(best, pf[t[2]] ?? 0);
      sum += best / profMax[d]; // only the best matched tag counts: a cap, not a sum
    }
    cafeNorm[i] = sum / asked.length;
  });
  const out = new Float64Array(prep.rows.length);
  for (let r = 0; r < prep.rows.length; r++) {
    const row = prep.rows[r];
    let cs = 0;
    for (const t of row.tags) cs += pc[t[2]] ?? 0;
    const coffeeNorm = maxCoffee ? cs / maxCoffee : 0;
    out[r] = ((1 - C.cafeShare) * coffeeNorm + C.cafeShare * cafeNorm[row.ci]) * (1 + C.alpha * prep.cafes[row.ci].prior);
  }
  return out;
}

// ---------- hashing and drawing ----------

function mix(a: number) {
  a = Math.imul(a ^ (a >>> 16), 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
/** Seeded hash in [0, 1), used only to break exact ties. */
export const tieHash = (seed: number, k: number) => mix((seed + Math.imul(k, 0x9e3779b1)) | 0);

function draw(weights: number[], rng: () => number) {
  let total = 0;
  for (const w of weights) total += w;
  let t = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    t -= weights[i];
    if (t <= 0) return i;
  }
  return weights.length - 1;
}

// ---------- reason line ----------

function joinList(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

function orderMatches(matches: [string, string, number][], dimOrder: readonly string[], keep: number) {
  return [...matches]
    .sort((a, b) => b[2] - a[2] || dimOrder.indexOf(a[0]) - dimOrder.indexOf(b[0]))
    .slice(0, keep)
    .map((m) => m[1]);
}

export function buildReason(cafeName: string, coffeeTagValues: string[], cafeTagValues: string[]) {
  if (coffeeTagValues.length && cafeTagValues.length)
    return `Matches your ${joinList(coffeeTagValues)} taste, and ${cafeName} is ${joinList(cafeTagValues)}.`;
  if (coffeeTagValues.length) return `Matches your ${joinList(coffeeTagValues)} taste.`;
  if (cafeTagValues.length) return `${cafeName} is ${joinList(cafeTagValues)}, which fits your vibe.`;
  return "A popular pick worth trying.";
}

// ---------- picking ----------

interface Cand {
  ci: number;
  best: number; // the cafe's score used for ranking and bands (best drink x menu factor)
  raw: number; // the cafe's best drink score
  rows: number[];
}

/** Top 3 coffees from 3 different cafes (best match, close match, wildcard). */
export function recommendFromProfile(profile: Profile, data: QuizData, opts: RecommendOptions = {}): Pick[] {
  const prep = prepare(data);
  const seed = opts.seed ?? 12345;
  const rng = opts.rng;
  const score = scoreRows(profile, prep);
  let global = 0;
  for (let r = 0; r < score.length; r++) if (score[r] > global) global = score[r];

  for (const floor of [C.minDimensions, 1] as const) {
    const lists = prep.byCafe[floor === 1 ? 1 : 3];
    const cands: Cand[] = [];
    for (let ci = 0; ci < lists.length; ci++) {
      const rows = lists[ci];
      if (!rows.length) continue;
      let raw = -1;
      for (const r of rows) if (score[r] > raw) raw = score[r];
      cands.push({ ci, best: raw * prep.cafes[ci].menuFactor, raw, rows });
    }
    if (cands.length < 3) continue;
    const cafeHash = (ci: number) => tieHash(seed, ci * 100003);
    cands.sort((a, b) => b.best - a.best || cafeHash(a.ci) - cafeHash(b.ci));

    const rowOrder = (c: Cand) =>
      [...c.rows].sort((a, b) => score[b] - score[a] || tieHash(seed, prep.rows[a].coffee.id) - tieHash(seed, prep.rows[b].coffee.id));
    const pickRow = (c: Cand) => {
      const sorted = rowOrder(c);
      if (!rng) return sorted[0];
      const pool = sorted.filter((r) => score[r] >= c.raw * C.coffeeBand);
      if (pool.length === 1) return pool[0];
      return pool[draw(pool.map((r) => Math.exp((score[r] / c.raw - 1) / C.tau)), rng)];
    };
    const emit = (c: Cand, slot: Slot): Pick => {
      const r = pickRow(c);
      return toPick(profile, prep, r, slot, score[r], global);
    };

    if (!rng) return [emit(cands[0], 1), emit(cands[1], 2), emit(cands[2], 3)];

    const top = cands[0].best;
    const taken = new Set<number>();
    const take = (band: number, tau: number, wild: boolean, slot: Slot) => {
      let pool = cands.filter((c) => !taken.has(c.ci) && c.best >= top * band);
      if (slot !== 1 && pool.length < C.minCandidates) pool = cands.filter((c) => !taken.has(c.ci)).slice(0, C.minCandidates);
      const w = pool.map((c) => Math.exp((c.best / top - 1) / tau) * (wild ? 1 / (1 + prep.cafes[c.ci].prior) : 1));
      const c = pool[draw(w, rng)];
      taken.add(c.ci);
      return emit(c, slot);
    };
    return [take(C.band1, C.tau / 4, false, 1), take(C.band2, C.tau / 2, false, 2), take(C.band3, C.tau, true, 3)];
  }
  return [];
}

function toPick(profile: Profile, prep: Prepared, r: number, slot: Slot, score: number, global: number): Pick {
  const row = prep.rows[r];
  const cafe = prep.cafes[row.ci];
  const coffeeMatches: [string, string, number][] = [];
  const cafeMatches: [string, string, number][] = [];
  for (const [d, v, k] of row.tags) if (profile[k]) coffeeMatches.push([d, v, profile[k]]);
  for (const [d, v, k] of cafe.tags) if (profile[k]) cafeMatches.push([d, v, profile[k]]);
  const coffeeTagValues = orderMatches(coffeeMatches, COFFEE_DIMS, 3);
  const cafeTagValues = orderMatches(cafeMatches, CAFE_DIMS, 2);
  return {
    slot, label: SLOT_LABELS[slot], coffee: row.coffee, cafeName: cafe.name, cafe: cafe.cafe,
    score, quality: global ? score / global : 0,
    coffeeTags: coffeeTagValues, cafeTags: cafeTagValues,
    reason: buildReason(cafe.name, coffeeTagValues, cafeTagValues),
  };
}

export function recommend(chosen: string[][], data: QuizData, opts: RecommendOptions = {}): Pick[] {
  return recommendFromProfile(buildProfile(chosen), data, opts);
}

/** Convenience for the app and tests: a seeded draw from letters and a roll. */
export function recommendSeeded(chosen: string[][], data: QuizData, seed: number): Pick[] {
  return recommend(chosen, data, { rng: mulberry32(seed ^ 0x9e3779b9), seed });
}
