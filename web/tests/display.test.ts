import { describe, expect, it } from "vitest";
import { splitName } from "@/lib/display";
import { loadData } from "./helpers";

describe("splitName (display only)", () => {
  it("splits at a spaced dash into a main name and a subtitle", () => {
    expect(splitName("Frozen Bottle - Milkshakes, Desserts And Ice Cream")).toMatchObject({ main: "Frozen Bottle", sub: "Milkshakes, Desserts And Ice Cream" });
  });
  it("leaves names without a spaced dash alone", () => {
    expect(splitName("Third Wave Coffee")).toEqual({ main: "Third Wave Coffee", sub: null, sep: "" });
    expect(splitName("Cafe Mocha (210ml)")).toMatchObject({ sub: null });
    expect(splitName("Co-op Cafe").sub).toBeNull(); // a hyphen inside a word is not a separator
  });
  it("does not split when a side would be empty", () => {
    expect(splitName("- Leading").sub).toBeNull();
    expect(splitName("Trailing -").sub).toBeNull();
  });
  it("keeps every character of every real cafe and coffee name", () => {
    const data = loadData();
    const names = [...Object.keys(data.cafes), ...data.coffees.map((c) => c.name)];
    let split = 0;
    for (const n of names) {
      const s = splitName(n);
      expect(s.sub === null ? s.main : s.main + s.sep + s.sub).toBe(n);
      if (s.sub) split++;
    }
    expect(split).toBeGreaterThan(5); // there really are names with a subtitle
  });
});
