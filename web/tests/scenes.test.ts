import { describe, expect, it } from "vitest";
import { mkdirSync, writeFileSync } from "node:fs";
import { QUESTIONS } from "@/lib/questions";
import { buildProfile } from "@/lib/scoring";
import { CHARACTERS, SCENES, pickCharacter, pickScene, type SceneId } from "@/lib/scenes";
import { mulberry32 } from "@/lib/rng";

function distribution() {
  const counts = new Map<SceneId, number>();
  const idx = new Array(9).fill(0);
  for (;;) {
    const s = pickScene(buildProfile(idx.map((a, qi) => QUESTIONS[qi].answers[a].tags)));
    counts.set(s, (counts.get(s) ?? 0) + 1);
    let i = 8;
    while (i >= 0 && ++idx[i] === 4) idx[i--] = 0;
    if (i < 0) break;
  }
  return counts;
}

describe("scenes", () => {
  it("has eight scenes with a title, a caption and four affinity words each", () => {
    expect(SCENES).toHaveLength(8);
    for (const s of SCENES) {
      expect(s.title.length).toBeGreaterThan(5);
      expect(s.caption.length).toBeGreaterThan(10);
      expect(s.affinity).toHaveLength(4);
    }
  });
  it("is deterministic and falls back to the first scene when nothing matches", () => {
    expect(pickScene({})).toBe("auto");
    const p = buildProfile([["strong", "bold"]]);
    expect(pickScene(p)).toBe(pickScene(p));
  });
  it("picks every scene for some answers, and none dominates (all 262,144 combinations)", () => {
    const counts = distribution();
    const total = 4 ** 9;
    const rows = SCENES.map((s) => `| ${s.id} | ${counts.get(s.id) ?? 0} | ${(((counts.get(s.id) ?? 0) / total) * 100).toFixed(1)}% |`);
    mkdirSync(new URL("../test-results/", import.meta.url), { recursive: true });
    writeFileSync(new URL("../test-results/scene-distribution.md", import.meta.url), `# Scene distribution over all ${total} answer sets\n\n| Scene | Quizzes | Share |\n|---|---|---|\n${rows.join("\n")}\n`);
    for (const s of SCENES) {
      const share = (counts.get(s.id) ?? 0) / total;
      expect(share, `${s.id} reachable`).toBeGreaterThan(0.03);
      expect(share, `${s.id} not dominant`).toBeLessThan(0.3);
    }
  });
  it("draws all three characters from a seeded source, reproducibly", () => {
    const r = mulberry32(5);
    const seen = new Set(Array.from({ length: 60 }, () => pickCharacter(r)));
    expect([...seen].sort()).toEqual([...CHARACTERS].sort());
    expect(pickCharacter(mulberry32(9))).toBe(pickCharacter(mulberry32(9)));
  });
});
