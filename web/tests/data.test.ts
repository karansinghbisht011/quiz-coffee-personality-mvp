import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { loadData } from "./helpers";
import { coffeeTags, cafeTags } from "@/lib/scoring";

const data = loadData();

const VOCAB: Record<string, string[]> = {
  strength: ["mild", "medium", "strong"],
  sweetness: ["none", "light", "sweet", "dessert"],
  milk: ["black", "milk", "plant milk"],
  temperature: ["hot", "iced"],
  flavour: ["nutty", "chocolate", "caramel", "fruity", "spiced", "classic"],
  adventurousness: ["familiar", "curious", "bold"],
  vibe: ["cozy", "social", "work-friendly", "aesthetic", "quick stop"],
  setting: ["chain", "pub or brewery"],
  crowd: ["quiet", "lively"],
};

describe("quiz_data.json integrity (public copy)", () => {
  it("is the same file the data pipeline exports (no drift)", () => {
    const pipeline = readFileSync(new URL("../../data/quiz_data.json", import.meta.url), "utf8");
    const pub = readFileSync(new URL("../public/quiz_data.json", import.meta.url), "utf8");
    expect(pub).toBe(pipeline);
  });

  it("has the expected size (snapshot of the 2026-10-06 export)", () => {
    expect(data.coffees).toHaveLength(3286);
    expect(Object.keys(data.cafes)).toHaveLength(227);
  });

  it("has unique coffee ids and non-empty names", () => {
    const ids = data.coffees.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of data.coffees) expect(c.name.trim().length).toBeGreaterThan(0);
  });

  it("links every coffee to a known cafe, and every cafe has at least one coffee", () => {
    const used = new Set<string>();
    for (const c of data.coffees) {
      expect(data.cafes[c.cafe], `coffee ${c.id} cafe ${c.cafe}`).toBeDefined();
      used.add(c.cafe);
    }
    expect([...Object.keys(data.cafes)].filter((n) => !used.has(n))).toEqual([]);
  });

  it("uses only vocabulary values for every tag", () => {
    for (const c of data.coffees)
      for (const [d, v] of coffeeTags(c)) expect(VOCAB[d], `${d}:${v} (coffee ${c.id})`).toContain(v);
    for (const [name, cafe] of Object.entries(data.cafes))
      for (const [d, v] of cafeTags(cafe)) expect(VOCAB[d], `${d}:${v} (${name})`).toContain(v);
  });

  it("handles the combined hot|iced temperature value", () => {
    const both = data.coffees.filter((c) => c.temperature === "hot|iced");
    expect(both.length).toBeGreaterThan(0);
    for (const c of both) {
      const temps = coffeeTags(c).filter(([d]) => d === "temperature").map(([, v]) => v);
      expect(temps.sort()).toEqual(["hot", "iced"]);
    }
  });

  it("has a Maps link that is a URL or 'Any' (franchises only)", () => {
    for (const [name, cafe] of Object.entries(data.cafes)) {
      if (cafe.maps_link === "Any") expect(cafe.type, name).toBe("franchise");
      else expect(() => new URL(cafe.maps_link), name).not.toThrow();
    }
  });

  it("has a positive integer popularity rank or null", () => {
    for (const [name, cafe] of Object.entries(data.cafes)) {
      if (cafe.popularity_rank !== null) {
        expect(Number.isInteger(cafe.popularity_rank), name).toBe(true);
        expect(cafe.popularity_rank, name).toBeGreaterThan(0);
      }
    }
  });

  it("carries no price anywhere (user decision, 2026-10-06)", () => {
    const text = JSON.stringify(data);
    expect(text).not.toMatch(/"(price|cost|mrp|rupees?|inr)"/i);
    expect(text).not.toContain("₹");
    for (const c of data.coffees) expect(Object.keys(c).sort()).toEqual(
      ["adventurousness", "cafe", "flavour", "id", "milk", "name", "strength", "sweetness", "temperature"]);
  });

  it("keeps arrays as arrays and scalars as scalars", () => {
    for (const c of data.coffees) expect(Array.isArray(c.flavour)).toBe(true);
    for (const cafe of Object.values(data.cafes)) expect(Array.isArray(cafe.vibe)).toBe(true);
  });
});
