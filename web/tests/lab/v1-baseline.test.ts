// v1 REFERENCE: regression snapshot of v1 results on the live 2026-10-06 data, taken before the scoring
// refactor (prepared tags, best-per-cafe pass). If the data is rebuilt on purpose, update these.
import { describe, expect, it } from "vitest";
import { recommend } from "./v1";
import { loadData, tagsFor } from "../helpers";

const data = loadData();
const brief = (letters: string) => recommend(tagsFor(letters), data).map((p) => `${p.coffee.name} @ ${p.cafeName} (${p.raw})`);

describe("baseline snapshot on live data", () => {
  it("thriller", () => expect(brief("AAABABADA")).toEqual([
    "Kopi Luwak Espresso (R) @ Ainmane Cafe And Speciality Store (53)", "Ruby Americano @ ee Kavii Kafe (45)", "Tonic Espresso @ Coffee Brewery (45)"]));
  it("cozy sweet tooth", () => expect(brief("BBBAAABAB")).toEqual([
    "Caramel Latte @ Demitasse Coffee (50)", "Caramel Mocha (210ml) @ Roastea - Curated Coffee And Tea Artisans (49)", "Cafe Latte @ Lucid Dreams Coffee (48)"]));
  it("iced party person", () => expect(brief("DDDCBDDBD")).toEqual([
    "Cranberry Mocha @ BANOFFEE (32)", "Strawberry Cream Iced Latte @ BRGR & BREWS (30)", "Iced Mocha @ Brewsom Coffee (28)"]));
  it("curious explorer", () => expect(brief("CCCDDCCCC")).toEqual([
    "Orange Cold Brew @ Colates Cafe (37)", "Orange Mint Cold Brew (350ml) @ Roastea - Curated Coffee And Tea Artisans (37)", "Aerocano @ Fast Coffee (37)"]));
});
