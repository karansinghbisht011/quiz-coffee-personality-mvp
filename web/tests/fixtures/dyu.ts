// Frozen fixture: Dyu Art Cafe exactly as in specs/tagging-rubric.md section 4 (coffees 1 to 17)
// and specs/scoring-spec.md section 7. It does NOT read live data, so the spec's worked
// examples cannot drift when the database is rebuilt.
import type { Coffee, QuizData } from "@/lib/scoring";

type Row = [name: string, strength: string | null, sweetness: string | null, milk: string | null, temp: string | null, flavour: string[], adv: string | null];

const rows: Row[] = [
  ["Press Coffee", "medium", "none", "black", "hot", ["classic"], "familiar"],
  ["Espresso", "strong", "none", "black", "hot", ["classic"], "familiar"],
  ["Americano", "medium", "none", "black", "hot", ["classic"], "familiar"],
  ["Cappuccino", "medium", "light", "milk", "hot", ["classic"], "familiar"],
  ["Affogato", "medium", "dessert", "milk", "hot", [], "curious"],
  ["Melange", "medium", "dessert", "milk", "hot", ["classic"], "curious"],
  ["Cafe Miel", "medium", "sweet", "milk", "hot", [], "curious"],
  ["Salted Caramel Latte", "medium", "dessert", "milk", "hot", ["caramel"], "familiar"],
  ["Filter Coffee", "strong", null, "milk", "hot", ["classic"], "familiar"],
  ["Cafe Mocha", "medium", "sweet", "milk", "hot", ["chocolate"], "familiar"],
  ["Chukku Kappi", null, "sweet", null, "hot", ["spiced"], "bold"],
  ["Cold Coffee", "medium", "none", "black", "iced", ["classic"], "familiar"],
  ["Coffee Frappe", "mild", "dessert", "milk", "iced", ["classic"], "familiar"],
  ["Cold Brew Coffee", "medium", "none", "black", "iced", ["classic"], "curious"],
  ["Vietnamese Iced Coffee", "strong", "sweet", "milk", "iced", ["classic"], "curious"],
  ["Iced Caramel Latte", "medium", "sweet", "milk", "iced", ["caramel"], "familiar"],
  ["Iced Coconut Water Americano", "medium", "light", "black", "iced", ["fruity"], "bold"],
];

export const dyuCoffees: Coffee[] = rows.map(([name, strength, sweetness, milk, temperature, flavour, adventurousness], i) => ({
  id: 100 + i + 1,
  cafe: "Dyu Art Cafe",
  name,
  strength, sweetness, milk, temperature, flavour, adventurousness,
}));

export const dyuData: QuizData = {
  cafes: {
    "Dyu Art Cafe": {
      maps_link: "https://example.test/dyu", type: "standalone", popularity_rank: 20,
      vibe: ["work-friendly", "aesthetic"], crowd: "quiet", setting: null,
    },
  },
  coffees: dyuCoffees,
};

export const cafe = (rank: number | null, extra: Partial<QuizData["cafes"][string]> = {}) => ({
  maps_link: "Any", type: "standalone", popularity_rank: rank, vibe: [], crowd: null, setting: null, ...extra,
});

/** A coffee with every dimension filled unless overridden. */
export const coffee = (id: number, cafeName: string, over: Partial<Coffee> = {}): Coffee => ({
  id, cafe: cafeName, name: `${cafeName} drink ${id}`,
  strength: "medium", sweetness: "none", milk: "black", temperature: "hot", flavour: ["classic"], adventurousness: "familiar",
  ...over,
});
