// Scoring v2 rules (specs/scoring-spec.md section 8). Small synthetic data for each rule, real data for the statistics.
import { describe, expect, it } from "vitest";
import { SCORING as C } from "@/lib/scoring-config";
import { mulberry32, makeSeed } from "@/lib/rng";
import {
  buildProfile, buildReason, prepare, recommend, recommendFromProfile, recommendSeeded, scoreRows, type QuizData, type Profile,
} from "@/lib/scoring";
import { cafe, coffee } from "./fixtures/dyu";
import { loadData, tagsFor } from "./helpers";

const det = (profile: Profile, data: QuizData, seed = 1) => recommendFromProfile(profile, data, { seed });
const byName = (picks: ReturnType<typeof det>, name: string) => picks.find((p) => p.cafeName === name)!;

describe("rarity weights", () => {
  const data: QuizData = {
    cafes: { A: cafe(1) },
    coffees: [...Array(9).keys()].map((i) => coffee(i + 1, "A", { flavour: ["classic"] })).concat([coffee(10, "A", { flavour: ["nutty"] })]),
  };
  const prep = prepare(data);
  it("gives a rarer tag a larger weight than a common one", () => {
    expect(prep.coffeeIdf.get("flavour:nutty")!).toBeGreaterThan(prep.coffeeIdf.get("flavour:classic")!);
  });
  it("keeps every weight inside the clamp", () => {
    for (const w of [...prep.coffeeIdf.values(), ...prep.cafeIdf.values()]) {
      expect(w).toBeGreaterThanOrEqual(C.idfMin);
      expect(w).toBeLessThanOrEqual(C.idfMax);
    }
  });
  it("computes weights for every tag on the real data, all inside the clamp", () => {
    const real = prepare(loadData());
    expect(real.coffeeIdf.size).toBeGreaterThan(20);
    for (const w of real.coffeeIdf.values()) expect(w).toBeGreaterThanOrEqual(C.idfMin);
  });
});

describe("cafe bonus: capped, normalised, neutral for missing data", () => {
  const filler = { C: cafe(3), D: cafe(4) };
  const mk = (a: Partial<ReturnType<typeof cafe>>, b: Partial<ReturnType<typeof cafe>>): QuizData => ({
    cafes: { A: cafe(1, a), B: cafe(1, b), ...filler },
    coffees: ["A", "B", "C", "D"].map((n, i) => coffee(i + 1, n)),
  });
  it("a cafe with three matched vibe tags earns no more than one with a single matched vibe tag", () => {
    const data = mk({ vibe: ["cozy", "social", "aesthetic"] }, { vibe: ["cozy"] });
    const picks = det(buildProfile([["cozy", "social", "aesthetic"]]), data);
    expect(Math.abs(byName(picks, "A").score - byName(picks, "B").score)).toBeLessThan(1e-9);
  });
  it("a missing crowd tag counts as neutral: between a match and a mismatch", () => {
    const data: QuizData = {
      cafes: { A: cafe(1, { crowd: "quiet" }), B: cafe(1, { crowd: null }), C: cafe(1, { crowd: "lively" }) },
      coffees: ["A", "B", "C"].map((n, i) => coffee(i + 1, n)),
    };
    const picks = det(buildProfile([["quiet"]]), data);
    const [m, n, x] = [byName(picks, "A").score, byName(picks, "B").score, byName(picks, "C").score];
    expect(m).toBeGreaterThan(n);
    expect(n).toBeGreaterThan(x);
    expect(m - n).toBeCloseTo(n - x, 6); // 1.0, 0.5, 0.0
  });
});

describe("small skews", () => {
  it("the popularity prior favours a better rank only slightly (about the size of alpha)", () => {
    const data: QuizData = { cafes: { A: cafe(1), B: cafe(100), C: cafe(50) }, coffees: [coffee(1, "A"), coffee(2, "B"), coffee(3, "C")] };
    const picks = det(buildProfile([["medium"]]), data);
    const ratio = byName(picks, "A").score / byName(picks, "B").score;
    expect(ratio).toBeGreaterThan(1.05);
    expect(ratio).toBeLessThan(1 + C.alpha + 0.01);
  });
  it("a cafe with a much bigger menu ranks below an identical cafe with one drink", () => {
    const big = [...Array(20).keys()].map((i) => coffee(100 + i, "Big"));
    const data: QuizData = { cafes: { Big: cafe(5), Small: cafe(5), X: cafe(9), Y: cafe(9) }, coffees: [...big, coffee(1, "Small"), coffee(2, "X"), coffee(3, "Y")] };
    const picks = det(buildProfile([["medium"]]), data);
    // Big ranks last (4th) and is dropped; the one-drink cafe is kept.
    expect(picks.map((p) => p.cafeName)).toContain("Small");
    expect(picks.map((p) => p.cafeName)).not.toContain("Big");
  });
  it("a blank rank gets no popularity boost", () => {
    const data: QuizData = { cafes: { A: cafe(null), B: cafe(1), C: cafe(60) }, coffees: [coffee(1, "A"), coffee(2, "B"), coffee(3, "C")] };
    const picks = det(buildProfile([["medium"]]), data);
    expect(byName(picks, "B").score).toBeGreaterThan(byName(picks, "A").score);
  });
});

describe("hash tie-break replaces popularity rank", () => {
  const six = ["A", "B", "C", "D", "E", "F"];
  const data: QuizData = { cafes: Object.fromEntries(six.map((n) => [n, cafe(10)])), coffees: six.map((n, i) => coffee(i + 1, n)) };
  const profile = buildProfile([["medium"]]);
  it("is stable for one seed", () => {
    expect(det(profile, data, 7).map((p) => p.cafeName)).toEqual(det(profile, data, 7).map((p) => p.cafeName));
  });
  it("spreads exact ties across cafes as the seed changes", () => {
    const firsts = new Set(Array.from({ length: 40 }, (_, s) => det(profile, data, s + 1)[0].cafeName));
    expect(firsts.size).toBeGreaterThanOrEqual(3);
  });
});

describe("eligibility floor", () => {
  const sparse = { strength: "strong", sweetness: null, milk: "black", temperature: null, flavour: [], adventurousness: null };
  it("skips a coffee with fewer than 3 of 6 dimensions filled when 3 other cafes qualify", () => {
    const d: QuizData = { cafes: { A: cafe(1), B: cafe(2), C: cafe(3), D: cafe(4) }, coffees: [coffee(1, "A", sparse), coffee(2, "B"), coffee(3, "C"), coffee(4, "D")] };
    expect(det(buildProfile([["strong"]]), d).map((p) => p.cafeName).sort()).toEqual(["B", "C", "D"]);
  });
  it("relaxes to 1 dimension when fewer than three cafes qualify", () => {
    const d: QuizData = { cafes: { A: cafe(1), B: cafe(2), C: cafe(3) }, coffees: [coffee(1, "A", sparse), coffee(2, "B"), coffee(3, "C")] };
    expect(det(buildProfile([["strong"]]), d).map((p) => p.cafeName).sort()).toEqual(["A", "B", "C"]);
  });
  it("returns nothing, safely, when fewer than three cafes exist at all", () => {
    const d: QuizData = { cafes: { A: cafe(1) }, coffees: [coffee(1, "A")] };
    expect(det(buildProfile([["strong"]]), d)).toEqual([]);
  });
});

describe("bands and roles (random mode)", () => {
  // 14 cafes, one drink each, scores graded by how many of the profile's coffee tags the drink matches.
  const profile = buildProfile([["strong", "black", "hot", "sweet", "caramel", "fruity"]]);
  const grades: Partial<Parameters<typeof coffee>[2]>[] = [
    { strength: "strong", milk: "black", temperature: "hot", sweetness: "sweet", flavour: ["caramel"], adventurousness: "familiar" },
    { strength: "strong", milk: "black", temperature: "hot", sweetness: "sweet", flavour: ["classic"] },
    { strength: "strong", milk: "black", temperature: "hot", sweetness: "none", flavour: ["classic"] },
    { strength: "strong", milk: "milk", temperature: "hot", sweetness: "none", flavour: ["classic"] },
    { strength: "strong", milk: "milk", temperature: "iced", sweetness: "none", flavour: ["classic"] },
    { strength: "medium", milk: "milk", temperature: "iced", sweetness: "none", flavour: ["classic"] },
  ];
  const names = Array.from({ length: 14 }, (_, i) => `Cafe${i}`);
  const data: QuizData = {
    cafes: Object.fromEntries(names.map((n, i) => [n, cafe(i + 1)])),
    coffees: names.map((n, i) => coffee(i + 1, n, grades[Math.min(i, grades.length - 1)])),
  };
  const prep = prepare(data);
  const score = scoreRows(profile, prep);
  const adj = prep.rows.map((r, i) => ({ name: r.coffee.cafe, v: score[i] * prep.cafes[r.ci].menuFactor }));
  const top = Math.max(...adj.map((a) => a.v));
  const adjOf = (name: string) => adj.find((a) => a.name === name)!.v;

  it("always returns 3 different cafes in role order, with labels", () => {
    for (let s = 1; s <= 200; s++) {
      const p = recommendFromProfile(profile, data, { rng: mulberry32(s), seed: s });
      expect(p.map((x) => x.slot)).toEqual([1, 2, 3]);
      expect(p.map((x) => x.label)).toEqual(["Best match", "Close match", "Wildcard"]);
      expect(new Set(p.map((x) => x.cafeName)).size).toBe(3);
    }
  });
  it("draws each role from its band; slots 2 and 3 are widened to the best 8 when the band is thin, slot 1 never (spec section 8.2)", () => {
    const vals = adj.map((x) => x.v).sort((x, y) => y - x);
    // a pool is every cafe at or above the band line, or at or above the k-th best score when the band is thin (ties included)
    const pool = (band: number, extra: number) => {
      const line = Math.min(top * band, vals[C.minCandidates + extra - 1]) - 1e-9;
      return new Set(names.filter((n) => adjOf(n) >= line));
    };
    const p1 = new Set(names.filter((n) => adjOf(n) >= top * C.band1 - 1e-9)), p2 = pool(C.band2, 1), p3 = pool(C.band3, 2); // earlier picks are excluded, so the widened pool reaches one place further each time
    for (let s = 1; s <= 400; s++) {
      const [a, b, c] = recommendFromProfile(profile, data, { rng: mulberry32(s), seed: s });
      expect(p1.has(a.cafeName), `slot 1: ${a.cafeName}`).toBe(true);
      expect(p2.has(b.cafeName), `slot 2: ${b.cafeName}`).toBe(true);
      expect(p3.has(c.cafeName), `slot 3: ${c.cafeName}`).toBe(true);
    }
  });
  it("lets every cafe inside the first band take slot 1 over many rolls, and varies slot 3", () => {
    const inBand = names.filter((n) => adjOf(n) >= top * C.band1);
    const first = new Set<string>(), third = new Set<string>();
    for (let s = 1; s <= 3000; s++) {
      const p = recommendFromProfile(profile, data, { rng: mulberry32(s), seed: s });
      first.add(p[0].cafeName);
      third.add(p[2].cafeName);
    }
    for (const n of inBand) expect(first.has(n), n).toBe(true);
    expect(third.size).toBeGreaterThanOrEqual(4);
  });
  it("without a random source it takes the top 3 cafes by adjusted score", () => {
    const expected = [...adj].sort((a, b) => b.v - a.v).slice(0, 3).map((a) => a.name);
    expect(det(profile, data).map((p) => p.cafeName).sort()).toEqual(expected.sort());
  });
});

describe("seeding and statistics on the real data", () => {
  const data = loadData();
  const chosen = tagsFor("AAABABADA");
  it("gives identical results for the same answers and roll", () => {
    const seed = makeSeed("AAABABADA", 42);
    expect(recommendSeeded(chosen, data, seed)).toEqual(recommendSeeded(chosen, data, seed));
  });
  it("gives different, equally valid results for different rolls", () => {
    const sets = new Set<string>();
    for (let roll = 1; roll <= 40; roll++) {
      const picks = recommendSeeded(chosen, data, makeSeed("AAABABADA", roll));
      sets.add(picks.map((p) => p.coffee.id).join("-"));
      expect(new Set(picks.map((p) => p.cafeName)).size).toBe(3);
    }
    expect(sets.size).toBeGreaterThanOrEqual(15);
  });
  it("keeps every pick close to the best match (quality guard)", () => {
    let min1 = 1, min2 = 1, min3 = 1;
    for (const letters of ["AAABABADA", "BBBAAABAB", "DDDCBDDBD", "CCCDDCCCC", "ABCDABCDA"])
      for (let roll = 1; roll <= 60; roll++) {
        const [a, b, c] = recommendSeeded(tagsFor(letters), data, makeSeed(letters, roll));
        min1 = Math.min(min1, a.quality); min2 = Math.min(min2, b.quality); min3 = Math.min(min3, c.quality);
      }
    expect(min1).toBeGreaterThan(0.8);
    expect(min2).toBeGreaterThan(0.7);
    expect(min3).toBeGreaterThan(0.6);
  });
  it("builds reason lines only from matched tags, never blank", () => {
    for (let roll = 1; roll <= 30; roll++)
      for (const p of recommendSeeded(chosen, data, makeSeed("AAABABADA", roll))) {
        expect(p.reason).not.toMatch(/undefined|null|\s{2,}/);
        expect(p.reason.length).toBeGreaterThan(10);
      }
  });
  it("takes under 50 ms per recommendation at the 95th percentile", () => {
    const rnd = mulberry32(99);
    const times: number[] = [];
    recommend(chosen, data, { rng: mulberry32(1) }); // warm-up: prepare()
    for (let i = 0; i < 400; i++) {
      const letters = Array.from({ length: 9 }, () => "ABCD"[Math.floor(rnd() * 4)]).join("");
      const t0 = performance.now();
      recommendSeeded(tagsFor(letters), data, i + 1);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.floor(times.length * 0.95)]).toBeLessThan(50);
  });
});

describe("reason lines (spec section 6, unchanged)", () => {
  it("T1", () => expect(buildReason("Dyu", ["strong", "black", "hot"], ["quiet"])).toBe("Matches your strong, black and hot taste, and Dyu is quiet."));
  it("T2", () => expect(buildReason("Dyu", ["strong"], [])).toBe("Matches your strong taste."));
  it("T3", () => expect(buildReason("Dyu", [], ["cozy", "quiet"])).toBe("Dyu is cozy and quiet, which fits your vibe."));
  it("T4", () => expect(buildReason("Dyu", [], [])).toBe("A popular pick worth trying."));
});
