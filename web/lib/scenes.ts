// Scene choice and the random character (specs/scene-spec.md). Pure functions; the random source is injected.
import { QUESTIONS } from "./questions";
import { WORD_DIM, type Profile } from "./scoring";

export type SceneId = "auto" | "traffic-police" | "traffic-jam" | "weather" | "signal" | "landmarks" | "tech-park" | "pov-cup";
export type Character = "guy" | "girl" | "both";
export const CHARACTERS: Character[] = ["guy", "girl", "both"];

export interface Scene {
  id: SceneId;
  title: string;
  caption: string;
  /** Quiz words that point to this scene (spec section 1). */
  affinity: string[];
}

// Order is also the tie-break order.
export const SCENES: Scene[] = [
  { id: "auto", title: "The Auto Wanderer", caption: "Quick stops and detours, nobody's idea of a straight line.", affinity: ["quick stop", "medium", "spiced", "curious"] },
  { id: "traffic-police", title: "The By-the-Book Sipper", caption: "Whistle, signal, the same trusted order every time.", affinity: ["classic", "familiar", "chain", "light"] },
  { id: "traffic-jam", title: "The Gridlock Survivor", caption: "Strong, black and bold, because the jam is long.", affinity: ["strong", "bold", "black", "none"] },
  { id: "weather", title: "The Monsoon Mood", caption: "Rain at 5 pm calls for something warm and sweet.", affinity: ["cozy", "hot", "sweet", "milk"] },
  { id: "signal", title: "The Signal Socialiser", caption: "Red light, loud friends, iced cups.", affinity: ["lively", "social", "iced", "pub or brewery"] },
  { id: "landmarks", title: "The Landmark Lingerer", caption: "Slow mornings near the city's best-known spots.", affinity: ["aesthetic", "quiet", "mild", "nutty"] },
  { id: "tech-park", title: "The Tech-Park Regular", caption: "Laptop open, filter of the day, one more commit.", affinity: ["work-friendly", "strong", "medium", "plant milk"] },
  { id: "pov-cup", title: "The Window-Seat Dreamer", caption: "Your view, with a cup in hand.", affinity: ["black", "curious", "dessert", "fruity"] },
];

export const sceneById = (id: SceneId) => SCENES.find((s) => s.id === id)!;

// Words such as "strong" appear in many answers, so a scene that lists them would win by default. Each scene's
// points are therefore divided by the points its words earn on average over all answers (a "lift").
const expectedPoints = (word: string) => {
  let total = 0;
  for (const q of QUESTIONS) for (const a of q.answers) { const i = a.tags.indexOf(word); if (i >= 0) total += i === 0 ? 2 : 1; }
  return total / 4; // one answer of four is chosen per question
};
const EXPECTED: Record<string, number> = Object.fromEntries(SCENES.map((s) => [s.id, s.affinity.reduce((sum, w) => sum + expectedPoints(w), 0) || 1]));

/** The scene whose affinity words earn the most points relative to their average; ties go to the earlier scene; no points means `auto`. */
export function pickScene(profile: Profile): SceneId {
  let best: Scene = SCENES[0];
  let bestScore = -1;
  for (const s of SCENES) {
    let pts = 0;
    for (const w of s.affinity) pts += profile[`${WORD_DIM[w]}:${w}`] ?? 0;
    const score = pts / EXPECTED[s.id];
    if (score > bestScore + 1e-9) { best = s; bestScore = score; }
  }
  return best.id;
}

export const pickCharacter = (rng: () => number): Character => CHARACTERS[Math.min(CHARACTERS.length - 1, Math.floor(rng() * CHARACTERS.length))];
