import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/lib/questions";
import { WORD_DIM, coffeeTags, cafeTags } from "@/lib/scoring";
import { loadData, readRepoFile } from "./helpers";

describe("questions", () => {
  it("has nine questions of four answers, with emoji, label, note and at least one tag", () => {
    expect(QUESTIONS).toHaveLength(9);
    for (const q of QUESTIONS) {
      expect(q.answers).toHaveLength(4);
      for (const a of q.answers) {
        expect(a.emoji.length).toBeGreaterThan(0);
        expect(a.label.length).toBeGreaterThan(0);
        expect(a.note.length).toBeGreaterThan(0);
        expect(a.tags.length).toBeGreaterThan(0);
      }
    }
  });

  it("has three questions from each style, in the order of REQUIREMENTS section 5", () => {
    expect(QUESTIONS.map((q) => q.group)).toEqual([
      ...Array(3).fill("Pop culture"), ...Array(3).fill("Lifestyle"), ...Array(3).fill("Abstract and quirky"),
    ]);
  });

  it("maps every quiz word to a dimension", () => {
    for (const q of QUESTIONS) for (const a of q.answers) for (const t of a.tags) expect(WORD_DIM[t], t).toBeDefined();
  });

  it("repeats no tag inside one answer", () => {
    for (const q of QUESTIONS) for (const a of q.answers) expect(new Set(a.tags).size, a.label).toBe(a.tags.length);
  });

  it("only asks for tag values that exist in the database", () => {
    const data = loadData();
    const present = new Set<string>();
    for (const c of data.coffees) for (const [d, v] of coffeeTags(c)) present.add(`${d}:${v}`);
    for (const cafe of Object.values(data.cafes)) for (const [d, v] of cafeTags(cafe)) present.add(`${d}:${v}`);
    for (const q of QUESTIONS) for (const a of q.answers) for (const t of a.tags)
      expect(present.has(`${WORD_DIM[t]}:${t}`), `${t} (${a.label})`).toBe(true);
  });

  it("matches the questions and answer tags written in REQUIREMENTS.md section 5", () => {
    const md = readRepoFile("REQUIREMENTS.md");
    const section = md.slice(md.indexOf("## 5. Quiz design"), md.indexOf("## 6. Matching and results"));
    const parsed: { q: string; answers: { label: string; tags: string[] }[] }[] = [];
    for (const line of section.split("\n")) {
      const q = line.match(/^\d+\.\s+(.*)$/);
      const a = line.match(/^\s+-\s+(.*?)\s+\[(.*)\]\s*$/);
      if (q) parsed.push({ q: q[1], answers: [] });
      else if (a && parsed.length) parsed[parsed.length - 1].answers.push({ label: a[1], tags: a[2].split(",").map((t) => t.trim()) });
    }
    expect(parsed).toHaveLength(9);
    parsed.forEach((p, i) => {
      expect(QUESTIONS[i].q).toBe(p.q);
      expect(QUESTIONS[i].answers.map((a) => ({ label: a.label, tags: a.tags }))).toEqual(p.answers);
    });
  });
});
