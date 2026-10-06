// Experimental scoring engine for the scoring lab (not used by the app). Every idea from
// the brainstorm (IMPLEMENTATION.md section 4.3) is a switch, so the lab can add them one by one.
import { COFFEE_DIMS, buildProfile, cafeTags, coffeeTags, type Profile, type QuizData } from "./v1";

export interface Opts {
  capCafe: boolean; // idea 1: one best matched tag per cafe dimension, normalised 0..1
  neutralBlank: boolean; // missing cafe dimension counts 0.5 instead of 0 (part of idea 1)
  idf: boolean; // idea 2: rarity weights
  alpha: number; // popularity prior strength (0 = off)
  lift: { k1: number; k2: number; k3: number }; // idea 9 (lab only): divide a cafe's chance by how well it matches a typical quiz, per slot
  menuPenalty: number; // delta: a big menu has more chances to hold a high scorer, so shrink the cafe's score by up to this share (0 = off)
  cafeShare: number; // gamma: share of the score that comes from the cafe part (0..1)
  soft: null | { band1: number; band2: number; band3: number; coffeeBand: number; tau: number; minCandidates: number; wildcard: boolean }; // ideas 3 and 5
}

export interface PickOut { coffeeId: number; cafe: string; score: number; slot: 1 | 2 | 3 }

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: number) {
  a = Math.imul(a ^ (a >>> 16), 0x85ebca6b);
  a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
  return ((a ^ (a >>> 16)) >>> 0) / 4294967296;
}
const hash = (seed: number, rowKey: number) => mix((seed + Math.imul(rowKey, 0x9e3779b1)) | 0);

const CAFE_DIM_LIST = ["vibe", "setting", "crowd"] as const;

export function makeEngine(data: QuizData, o: Opts, baselineProfiles: Profile[] = []) {
  const cafeNames = Object.keys(data.cafes);
  const cafeIdx = new Map(cafeNames.map((n, i) => [n, i]));
  const menuSize = new Map<string, number>();
  for (const c of data.coffees) menuSize.set(c.cafe, (menuSize.get(c.cafe) ?? 0) + 1);
  const maxMenu = Math.max(...menuSize.values());
  const maxRank = Math.max(...Object.values(data.cafes).map((c) => c.popularity_rank ?? 0));

  // tag counts for idf
  const coffeeCount = new Map<string, number>();
  const cafeCount = new Map<string, number>();
  for (const c of data.coffees) for (const [d, v] of coffeeTags(c)) coffeeCount.set(`${d}:${v}`, (coffeeCount.get(`${d}:${v}`) ?? 0) + 1);
  for (const c of Object.values(data.cafes)) for (const [d, v] of cafeTags(c)) cafeCount.set(`${d}:${v}`, (cafeCount.get(`${d}:${v}`) ?? 0) + 1);
  const idfTable = (counts: Map<string, number>, N: number) => {
    const raw = new Map<string, number>();
    for (const [k, n] of counts) raw.set(k, Math.log((N + 1) / (n + 1)));
    const mean = [...raw.values()].reduce((a, b) => a + b, 0) / raw.size;
    const out = new Map<string, number>();
    for (const [k, v] of raw) out.set(k, Math.min(1.8, Math.max(0.6, v / mean)));
    return out;
  };
  const coffeeIdf = idfTable(coffeeCount, data.coffees.length);
  const cafeIdf = idfTable(cafeCount, cafeNames.length);
  const wCoffee = (k: string) => (o.idf ? coffeeIdf.get(k) ?? 1 : 1);
  const wCafe = (k: string) => (o.idf ? cafeIdf.get(k) ?? 1 : 1);

  const cafes = cafeNames.map((name) => {
    const c = data.cafes[name];
    const tags = cafeTags(c).map(([d, v]) => ({ d, k: `${d}:${v}` }));
    return {
      name, tags,
      prior: c.popularity_rank == null ? 0 : 1 - (c.popularity_rank - 1) / maxRank,
      menuFactor: 1 - o.menuPenalty * Math.log(1 + (menuSize.get(name) ?? 1)) / Math.log(1 + maxMenu),
      has: new Set(tags.map((t) => t.d)),
    };
  });
  const rows = data.coffees.filter((c) => cafeIdx.has(c.cafe)).map((c) => {
    const tags = coffeeTags(c);
    return { id: c.id, ci: cafeIdx.get(c.cafe)!, keys: tags.map(([d, v]) => `${d}:${v}`), dims: new Set(tags.map(([d]) => d)).size };
  });

  const byCafe3: number[][] = cafes.map(() => []);
  const byCafe1: number[][] = cafes.map(() => []);
  rows.forEach((row, r) => { byCafe1[row.ci].push(r); if (row.dims >= 3) byCafe3[row.ci].push(r); });

  /** Score every row for a profile; returns arrays aligned with `rows` plus per-cafe context. */
  function scoreAll(profile: Profile) {
    const pc: Record<string, number> = {}; // coffee-tag value
    const pf: Record<string, number> = {}; // cafe-tag value
    const profMaxD: Record<string, number> = {};
    let maxCoffee = 0;
    for (const [k, p] of Object.entries(profile)) {
      const d = k.slice(0, k.indexOf(":"));
      if ((COFFEE_DIMS as readonly string[]).includes(d)) { pc[k] = p * wCoffee(k); maxCoffee += pc[k]; }
      else { pf[k] = p * wCafe(k); profMaxD[d] = Math.max(profMaxD[d] ?? 0, pf[k]); }
    }
    const asked = CAFE_DIM_LIST.filter((d) => profMaxD[d] !== undefined);
    const cafeNorm = new Float64Array(cafes.length);
    cafes.forEach((cf, i) => {
      if (o.capCafe) {
        if (!asked.length) return;
        let sum = 0;
        for (const d of asked) {
          if (!cf.has.has(d)) { sum += o.neutralBlank ? 0.5 : 0; continue; }
          let best = 0;
          for (const t of cf.tags) if (t.d === d) best = Math.max(best, pf[t.k] ?? 0);
          sum += best / profMaxD[d];
        }
        cafeNorm[i] = sum / asked.length;
      } else {
        // v1-style: sum of all matched cafe tags, normalised by the profile's total cafe points
        let sum = 0, tot = 0;
        for (const v of Object.values(pf)) tot += v;
        for (const t of cf.tags) sum += pf[t.k] ?? 0;
        cafeNorm[i] = tot ? sum / tot : 0;
      }
    });
    const score = new Float64Array(rows.length);
    for (let r = 0; r < rows.length; r++) {
      const row = rows[r];
      let cs = 0;
      for (const k of row.keys) cs += pc[k] ?? 0;
      const coffeeNorm = maxCoffee ? cs / maxCoffee : 0;
      score[r] = ((1 - o.cafeShare) * coffeeNorm + o.cafeShare * cafeNorm[row.ci]) * (1 + o.alpha * cafes[row.ci].prior);
    }
    return score;
  }

  function recommend(profile: Profile, seed = 12345, rng?: () => number): PickOut[] {
    const score = scoreAll(profile);
    let global = 0;
    for (let r = 0; r < rows.length; r++) if (score[r] > global) global = score[r];
    for (const floor of [3, 1]) {
      // best rows per cafe, sorted by score desc then hash asc
      const perCafe = floor === 3 ? byCafe3 : byCafe1;
      const cands: { ci: number; best: number; raw: number; rowsIn: number[] }[] = [];
      for (let ci = 0; ci < cafes.length; ci++) {
        const list = perCafe[ci];
        if (!list.length) continue;
        let best = -1;
        for (const r of list) if (score[r] > best) best = score[r];
        cands.push({ ci, best: best * cafes[ci].menuFactor, raw: best, rowsIn: list });
      }
      if (cands.length < 3) continue;
      const hcafe = (ci: number) => hash(seed, ci * 100003);
      const byScore = (a: { best: number; ci: number }, b: { best: number; ci: number }) => b.best - a.best || hcafe(a.ci) - hcafe(b.ci);
      cands.sort(byScore);
      const pickRow = (c: (typeof cands)[number], useRng: boolean) => {
        // best coffee of the cafe; in soft mode draw among coffees within coffeeBand of it
        const sorted = [...c.rowsIn].sort((a, b) => score[b] - score[a] || hash(seed, rows[a].id) - hash(seed, rows[b].id));
        if (!o.soft || !useRng || !rng) return sorted[0];
        const pool = sorted.filter((r) => score[r] >= c.raw * o.soft!.coffeeBand);
        if (pool.length === 1) return pool[0];
        const w = pool.map((r) => Math.exp((score[r] / c.raw - 1) / o.soft!.tau));
        return pool[draw(w, rng)];
      };
      const out: PickOut[] = [];
      const emit = (c: (typeof cands)[number], slot: 1 | 2 | 3, useRng: boolean) => {
        const r = pickRow(c, useRng);
        out.push({ coffeeId: rows[r].id, cafe: cafes[c.ci].name, score: score[r] / (global || 1), slot });
      };
      if (!o.soft || !rng) {
        for (let i = 0; i < 3; i++) emit(cands[i], (i + 1) as 1 | 2 | 3, false);
        return out;
      }
      const s = o.soft;
      const top = cands[0].best;
      const taken = new Set<number>();
      const take = (band: number, tau: number, wild: boolean, slot: 1 | 2 | 3, kappa: number) => {
        let pool = cands.filter((c) => !taken.has(c.ci) && c.best >= top * band);
        if (pool.length < s.minCandidates) pool = cands.filter((c) => !taken.has(c.ci)).slice(0, s.minCandidates);
        const w = pool.map((c) => Math.exp((c.best / top - 1) / tau) * (wild && s.wildcard ? 1 / (1 + cafes[c.ci].prior) : 1) * Math.pow(1 / baseline[c.ci], kappa));
        const c = pool[draw(w, rng)];
        taken.add(c.ci);
        emit(c, slot, true);
      };
      take(s.band1, s.tau / 4, false, 1, o.lift.k1);
      take(s.band2, s.tau / 2, false, 2, o.lift.k2);
      take(s.band3, s.tau, true, 3, o.lift.k3);
      return out;
    }
    return [];
  }
  // cafe baseline: mean best score over a fixed sample of profiles, normalised to mean 1 across cafes
  const baseline = new Float64Array(cafes.length).fill(1);
  if ((o.lift.k1 || o.lift.k2 || o.lift.k3) && baselineProfiles.length) {
    const acc = new Float64Array(cafes.length);
    for (const p of baselineProfiles) {
      const sc = scoreAll(p);
      const bests = new Float64Array(cafes.length);
      for (let r = 0; r < rows.length; r++) if (rows[r].dims >= 3 && sc[r] > bests[rows[r].ci]) bests[rows[r].ci] = sc[r];
      for (let i = 0; i < cafes.length; i++) acc[i] += bests[i];
    }
    const m = acc.reduce((a, b) => a + b, 0) / acc.length;
    for (let i = 0; i < cafes.length; i++) baseline[i] = Math.max(acc[i] / m, 0.05);
  }
  return { recommend, cafeNames };
}

function draw(w: number[], rng: () => number) {
  let total = 0;
  for (const x of w) total += x;
  let t = rng() * total;
  for (let i = 0; i < w.length; i++) { t -= w[i]; if (t <= 0) return i; }
  return w.length - 1;
}

export { buildProfile };
