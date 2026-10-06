// FROZEN COPY of the v1 engine (lesson 4.3 build, refactored 2026-10-06 in phase 1). Do not edit.
// Kept as the reference for the scoring lab and the v1 regression tests. Scoring per specs/scoring-spec.md sections 1 to 6. Plain functions, no React, so the spec's rules
// can be tested directly (web/tests). Behaviour is unchanged from v1; this version
// prepares the data once and picks the best coffee per cafe in one pass, so the
// exhaustive coverage test can run every answer combination quickly.

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

export interface Pick {
  coffee: Coffee;
  cafeName: string;
  cafe: Cafe;
  raw: number;
  coffeeTags: string[]; // matched coffee tag values, in reason order
  cafeTags: string[]; // matched cafe tag values, in reason order
  reason: string;
}

export const COFFEE_WEIGHT = 2;
export const CAFE_WEIGHT = 1;
export const MIN_COFFEE_DIMENSIONS = 3;

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

type Tag = [dim: string, value: string, key: string];

interface Row {
  coffee: Coffee;
  cafeName: string;
  cafe: Cafe;
  ctags: Tag[];
  ftags: Tag[];
  dims: number; // coffee dimensions that are filled
  rank: number; // popularity_rank, Infinity when blank
}

export interface Prepared {
  rows: Row[];
}

const preparedCache = new WeakMap<QuizData, Prepared>();

/** Pre-compute each coffee's tag keys once. Memoised per data object. */
export function prepare(data: QuizData): Prepared {
  const hit = preparedCache.get(data);
  if (hit) return hit;
  const rows: Row[] = [];
  for (const coffee of data.coffees) {
    const cafe = data.cafes[coffee.cafe];
    if (!cafe) continue;
    const ct = coffeeTags(coffee);
    rows.push({
      coffee,
      cafeName: coffee.cafe,
      cafe,
      ctags: ct.map(([d, v]) => [d, v, key(d, v)] as Tag),
      ftags: cafeTags(cafe).map(([d, v]) => [d, v, key(d, v)] as Tag),
      dims: new Set(ct.map(([d]) => d)).size,
      rank: cafe.popularity_rank ?? Number.POSITIVE_INFINITY,
    });
  }
  const prepared = { rows };
  preparedCache.set(data, prepared);
  return prepared;
}

function rawScore(profile: Profile, row: Row): number {
  let coffee = 0;
  for (const t of row.ctags) coffee += profile[t[2]] ?? 0;
  let cafe = 0;
  for (const t of row.ftags) cafe += profile[t[2]] ?? 0;
  return COFFEE_WEIGHT * coffee + CAFE_WEIGHT * cafe;
}

interface Scored {
  row: Row;
  raw: number;
}

/** Sort order: raw high first, then popularity_rank low first (blank worst), then id low first. */
function compare(a: Scored, b: Scored) {
  return b.raw - a.raw || a.row.rank - b.row.rank || a.row.coffee.id - b.row.coffee.id;
}

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

function toPick(profile: Profile, s: Scored): Pick {
  const coffeeMatches: [string, string, number][] = [];
  const cafeMatches: [string, string, number][] = [];
  for (const [d, v, k] of s.row.ctags) if (profile[k]) coffeeMatches.push([d, v, profile[k]]);
  for (const [d, v, k] of s.row.ftags) if (profile[k]) cafeMatches.push([d, v, profile[k]]);
  const coffeeTagValues = orderMatches(coffeeMatches, COFFEE_DIMS, 3);
  const cafeTagValues = orderMatches(cafeMatches, CAFE_DIMS, 2);
  return {
    coffee: s.row.coffee,
    cafeName: s.row.cafeName,
    cafe: s.row.cafe,
    raw: s.raw,
    coffeeTags: coffeeTagValues,
    cafeTags: cafeTagValues,
    reason: buildReason(s.row.cafeName, coffeeTagValues, cafeTagValues),
  };
}

/** Top `count` coffees from `count` different cafes (spec sections 3 to 6), from a profile. */
export function recommendFromProfile(profile: Profile, data: QuizData, count = 3): Pick[] {
  const { rows } = prepare(data);
  // Eligibility floor: 3 of 6 coffee dimensions; relax to 1 if fewer than `count` cafes qualify.
  let picked: Scored[] = [];
  for (const floor of [MIN_COFFEE_DIMENSIONS, 1]) {
    // Walking the sorted list and taking the first coffee of each cafe equals taking each cafe's best.
    const best = new Map<string, Scored>();
    for (const row of rows) {
      if (row.dims < floor) continue;
      const s: Scored = { row, raw: rawScore(profile, row) };
      const cur = best.get(row.cafeName);
      if (!cur || compare(s, cur) < 0) best.set(row.cafeName, s);
    }
    picked = [...best.values()].sort(compare).slice(0, count);
    if (picked.length === count) break;
  }
  return picked.map((s) => toPick(profile, s));
}

export function recommend(chosen: string[][], data: QuizData, count = 3): Pick[] {
  return recommendFromProfile(buildProfile(chosen), data, count);
}

/** Every eligible coffee scored and sorted (used by tests). */
export function rankAll(chosen: string[][], data: QuizData) {
  const profile = buildProfile(chosen);
  return prepare(data)
    .rows.filter((r) => r.dims >= MIN_COFFEE_DIMENSIONS)
    .map((row) => ({ row, raw: rawScore(profile, row) }))
    .sort(compare)
    .map((s) => ({ coffee: s.row.coffee, cafeName: s.row.cafeName, cafe: s.row.cafe, raw: s.raw }));
}
