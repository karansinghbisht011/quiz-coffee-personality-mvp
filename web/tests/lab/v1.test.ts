// v1 REFERENCE tests: the original scoring rules and the spec section 7 worked examples, run against the frozen v1 engine (tests/lab/v1.ts).
import { describe, expect, it } from "vitest";
import { buildProfile, buildReason, rankAll, recommend, type QuizData } from "./v1";
import { cafe, coffee, dyuData } from "../fixtures/dyu";
import { tagsFor } from "../helpers";

const top = (letters: string, n = 3) => rankAll(tagsFor(letters), dyuData).slice(0, n).map((r) => [r.coffee.name, r.raw]);

describe("profile (spec section 1)", () => {
  it("gives the first tag 2 points and the others 1", () => {
    expect(buildProfile([["strong", "bold"]])).toEqual({ "strength:strong": 2, "adventurousness:bold": 1 });
  });
  it("adds points across answers", () => {
    expect(buildProfile([["strong", "bold"], ["bold", "strong"]])).toEqual({ "strength:strong": 3, "adventurousness:bold": 3 });
  });
  it("rejects a word that is not in the vocabulary map", () => {
    expect(() => buildProfile([["nonsense"]])).toThrow(/Unmapped/);
  });
  it("matches the profile totals printed in spec section 7", () => {
    const p1 = buildProfile(tagsFor("AAABABADA"));
    expect(p1).toMatchObject({ "strength:strong": 12, "adventurousness:bold": 7, "vibe:work-friendly": 3, "temperature:hot": 2, "milk:black": 2, "flavour:classic": 1 });
    const p2 = buildProfile(tagsFor("BBBAAABAB"));
    expect(p2).toMatchObject({ "vibe:cozy": 9, "sweetness:sweet": 8, "milk:milk": 4, "temperature:hot": 3 });
    const p3 = buildProfile(tagsFor("DDDCBDDBD"));
    expect(p3).toMatchObject({ "crowd:lively": 11, "vibe:social": 5 });
    const p4 = buildProfile(tagsFor("CCCDDCCCC"));
    expect(p4).toMatchObject({ "adventurousness:curious": 12, "crowd:quiet": 5 });
  });
});

// The numbers below were cross-checked against an independent scorer (a separate Python script that
// parses the questions from REQUIREMENTS.md and the Dyu table from tagging-rubric.md). They differ from
// the tables printed in scoring-spec.md section 7, which have arithmetic slips (see the correction note there).
describe("spec section 7 worked examples (frozen Dyu fixture)", () => {
  it("answer set 1, the thriller person: Espresso 39, Filter Coffee 33, Vietnamese Iced Coffee 29", () => {
    expect(top("AAABABADA")).toEqual([["Espresso", 39], ["Filter Coffee", 33], ["Vietnamese Iced Coffee", 29]]);
  });
  it("answer set 2, the cozy sweet tooth: Cafe Mocha 35, Iced Caramel Latte 33, Cafe Miel 31", () => {
    expect(top("BBBAAABAB")).toEqual([["Cafe Mocha", 35], ["Iced Caramel Latte", 33], ["Cafe Miel", 31]]);
    const salted = rankAll(tagsFor("BBBAAABAB"), dyuData).find((r) => r.coffee.name === "Salted Caramel Latte");
    expect(salted?.raw).toBe(23); // tagged dessert, not sweet (gap 3 in the spec)
  });
  it("answer set 3, the iced party person: two drinks tie on 13 (lowest id first), then Vietnamese on 11", () => {
    expect(top("DDDCBDDBD")).toEqual([["Iced Caramel Latte", 13], ["Iced Coconut Water Americano", 13], ["Vietnamese Iced Coffee", 11]]);
  });
  it("answer set 4, the curious explorer: Cold Brew 35, then Affogato, Melange, Cafe Miel on 29 (id order)", () => {
    expect(top("CCCDDCCCC", 4)).toEqual([["Cold Brew Coffee", 35], ["Affogato", 29], ["Melange", 29], ["Cafe Miel", 29]]);
  });
  it("builds the reason line of the spec (template T1) for Espresso", () => {
    const [pick] = recommend(tagsFor("AAABABADA"), dyuData);
    expect(pick.coffee.name).toBe("Espresso");
    expect(pick.reason).toBe("Matches your strong, black and hot taste, and Dyu Art Cafe is work-friendly.");
  });
  it("returns as many cafes as exist when there are fewer than three", () => {
    expect(recommend(tagsFor("AAABABADA"), dyuData)).toHaveLength(1);
  });
});

describe("three different cafes and the tie-break (spec section 5)", () => {
  const strongOnly = [["strong"]];
  const data: QuizData = {
    cafes: { Dyu: cafe(20), B: cafe(12), C: cafe(5) },
    coffees: [coffee(1, "Dyu", { strength: "strong" }), coffee(2, "Dyu", { strength: "strong" }), coffee(3, "B", { strength: "strong" }), coffee(4, "C", { strength: "strong" })],
  };
  it("breaks equal scores by the lower popularity_rank, and never repeats a cafe", () => {
    expect(recommend(strongOnly, data).map((p) => p.cafeName)).toEqual(["C", "B", "Dyu"]);
  });
  it("breaks the spec's made-up example: Dyu 37 first, then B (rank 12), then C (rank 5)", () => {
    // Dyu has the best drink; B and C tie lower down and the better rank wins.
    const d: QuizData = {
      cafes: { Dyu: cafe(20), B: cafe(12), C: cafe(5) },
      coffees: [coffee(1, "Dyu", { strength: "strong", milk: "black" }), coffee(2, "Dyu", { strength: "medium", milk: "milk" }),
        coffee(3, "B", { strength: "strong", milk: "milk" }), coffee(4, "C", { strength: "strong", milk: "milk" })],
    };
    const out = recommend([["strong", "black"]], d);
    expect(out.map((p) => p.cafeName)).toEqual(["Dyu", "C", "B"]);
  });
  it("treats a missing popularity_rank as the worst", () => {
    const d: QuizData = { cafes: { A: cafe(null), B: cafe(99) }, coffees: [coffee(1, "A"), coffee(2, "B")] };
    expect(recommend([["medium"]], d).map((p) => p.cafeName)).toEqual(["B", "A"]);
  });
  it("breaks a tie on both score and rank by the lower coffee id", () => {
    const d: QuizData = { cafes: { A: cafe(5) }, coffees: [coffee(9, "A"), coffee(3, "A")] };
    expect(recommend([["medium"]], d)[0].coffee.id).toBe(3);
  });
  it("lists a franchise once however many drinks it has", () => {
    const d: QuizData = { cafes: { F: cafe(1, { type: "franchise" }), X: cafe(2), Y: cafe(3) }, coffees: [1, 2, 3, 4].map((i) => coffee(i, "F")).concat([coffee(5, "X"), coffee(6, "Y")]) };
    expect(recommend([["medium"]], d).map((p) => p.cafeName)).toEqual(["F", "X", "Y"]);
  });
});

describe("weights (spec section 3)", () => {
  it("counts coffee tags double and cafe tags once", () => {
    const d: QuizData = {
      cafes: { A: cafe(1, { vibe: ["cozy"] }), B: cafe(2) },
      coffees: [coffee(1, "A", { strength: "medium", flavour: [], sweetness: "none", milk: "black", temperature: "hot", adventurousness: "familiar" }),
        coffee(2, "B", { strength: "strong", flavour: [], sweetness: "none", milk: "black", temperature: "hot", adventurousness: "familiar" })],
    };
    // strong = 2 pts x2 = 4 for B; cozy = 1 pt x1 = 1 for A.
    const out = recommend([["strong", "cozy"]], d);
    expect(out.map((p) => [p.cafeName, p.raw])).toEqual([["B", 4], ["A", 1]]);
  });
  it("matches hot|iced against both a hot and an iced profile", () => {
    const d: QuizData = { cafes: { A: cafe(1) }, coffees: [coffee(1, "A", { temperature: "hot|iced" })] };
    expect(recommend([["hot"]], d)[0].raw).toBe(4);
    expect(recommend([["iced"]], d)[0].raw).toBe(4);
  });
  it("gives a blank tag no points and never a guess", () => {
    const d: QuizData = { cafes: { A: cafe(1) }, coffees: [coffee(1, "A", { strength: null, sweetness: null, milk: "black", temperature: "hot", flavour: [], adventurousness: "familiar" })] };
    expect(recommend([["strong"]], d)[0].raw).toBe(0);
  });
});

describe("eligibility floor (spec section 4)", () => {
  const sparse = { strength: "strong", sweetness: null, milk: "black", temperature: null, flavour: [], adventurousness: null };
  it("skips a coffee with fewer than 3 of 6 coffee dimensions filled when other cafes qualify", () => {
    const d: QuizData = {
      cafes: { A: cafe(1), B: cafe(2), C: cafe(3), D: cafe(4) },
      coffees: [coffee(1, "A", sparse), coffee(2, "B"), coffee(3, "C"), coffee(4, "D")],
    };
    expect(recommend([["strong"]], d).map((p) => p.cafeName)).toEqual(["B", "C", "D"]);
  });
  it("uses the better full coffee of a cafe instead of its sparse one", () => {
    const d: QuizData = {
      cafes: { A: cafe(1), B: cafe(2), C: cafe(3) },
      coffees: [coffee(1, "A", sparse), coffee(2, "A", { strength: "mild" }), coffee(3, "B"), coffee(4, "C")],
    };
    const a = recommend([["strong"]], d).find((p) => p.cafeName === "A");
    expect(a?.coffee.id).toBe(2);
  });
  it("relaxes the floor to 1 dimension when fewer than three cafes qualify", () => {
    const d: QuizData = { cafes: { A: cafe(1), B: cafe(2), C: cafe(3) }, coffees: [coffee(1, "A", sparse), coffee(2, "B"), coffee(3, "C")] };
    expect(recommend([["strong"]], d).map((p) => p.cafeName).sort()).toEqual(["A", "B", "C"]);
  });
});

describe("reason lines (spec section 6)", () => {
  it("T1: coffee and cafe tags", () => expect(buildReason("Dyu", ["strong", "black", "hot"], ["quiet"])).toBe("Matches your strong, black and hot taste, and Dyu is quiet."));
  it("T2: coffee tags only", () => expect(buildReason("Dyu", ["strong"], [])).toBe("Matches your strong taste."));
  it("T3: cafe tags only", () => expect(buildReason("Dyu", [], ["cozy", "quiet"])).toBe("Dyu is cozy and quiet, which fits your vibe."));
  it("T4: nothing matched", () => expect(buildReason("Dyu", [], [])).toBe("A popular pick worth trying."));
  it("joins two as 'x and y'", () => expect(buildReason("Dyu", ["a", "b"], [])).toBe("Matches your a and b taste."));
  it("keeps at most 3 coffee tags and 2 cafe tags, high points first", () => {
    const d: QuizData = {
      cafes: { A: cafe(1, { vibe: ["cozy", "social", "aesthetic"], crowd: "quiet", setting: "chain" }) },
      coffees: [coffee(1, "A", { strength: "strong", sweetness: "sweet", milk: "milk", temperature: "hot", flavour: ["caramel"], adventurousness: "bold" })],
    };
    const profile = [["strong", "sweet", "milk", "hot", "caramel", "bold", "cozy", "social", "aesthetic", "quiet", "chain"]];
    const [p] = recommend(profile, d);
    expect(p.coffeeTags).toHaveLength(3);
    expect(p.cafeTags).toHaveLength(2);
    expect(p.coffeeTags[0]).toBe("strong"); // 2 points beats the 1-point tags
    expect(p.cafeTags[0]).toBe("cozy"); // first in the list, cafe dimension order vibe, setting, crowd
  });
  it("never puts a blank or the word undefined in a reason", () => {
    for (const letters of ["AAAAAAAAA", "BBBBBBBBB", "CCCCCCCCC", "DDDDDDDDD"])
      for (const p of recommend(tagsFor(letters), dyuData)) expect(p.reason).not.toMatch(/undefined|null|\s{2,}/);
  });
});

describe("determinism", () => {
  it("gives the same result for the same answers", () => {
    expect(recommend(tagsFor("ABCDABCDA"), dyuData)).toEqual(recommend(tagsFor("ABCDABCDA"), dyuData));
  });
});
