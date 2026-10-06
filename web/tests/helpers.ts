import { readFileSync } from "node:fs";
import { QUESTIONS } from "@/lib/questions";
import type { QuizData } from "@/lib/scoring";

const path = (rel: string) => new URL(`../${rel}`, import.meta.url);

export const loadData = (): QuizData => JSON.parse(readFileSync(path("public/quiz_data.json"), "utf8"));
export const readRepoFile = (rel: string) => readFileSync(new URL(`../../${rel}`, import.meta.url), "utf8");

/** Option letters for Q1..Q9 ("ABCDABCDA") -> the tag words of each chosen answer. */
export const tagsFor = (letters: string): string[][] =>
  [...letters].map((l, qi) => QUESTIONS[qi].answers["ABCD".indexOf(l)].tags);
