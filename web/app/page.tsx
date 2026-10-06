"use client";

import { useEffect, useState } from "react";
import Landing from "@/components/Landing";
import QuizQuestion from "@/components/QuizQuestion";
import BrewingScreen from "@/components/BrewingScreen";
import Results from "@/components/Results";
import { QUESTIONS } from "@/lib/questions";
import { makeSeed, newRoll } from "@/lib/rng";
import { runReveal } from "@/lib/reveal";
import { photoUrl, photosFor, pickPhoto, type ScenePhoto } from "@/lib/photos";
import { buildProfile, recommendSeeded, type Pick, type QuizData } from "@/lib/scoring";
import { pickCharacter, pickScene, type Character, type SceneId } from "@/lib/scenes";

declare global {
  interface Window {
    __quizData?: Promise<QuizData>; // started by a tiny inline script in app/layout.tsx
  }
}

type Stage = "landing" | "quiz" | "result";

export default function Home() {
  const [data, setData] = useState<QuizData | null>(null);
  const [failed, setFailed] = useState(false);
  const [stage, setStage] = useState<Stage>("landing");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [character, setCharacter] = useState<Character>("both");
  const [scene, setScene] = useState<SceneId>("auto");
  const [photo, setPhoto] = useState<ScenePhoto | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [brewing, setBrewing] = useState(false);

  useEffect(() => {
    const load = () =>
      fetch("/quiz_data.json").then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<QuizData>;
      });
    // use the download the page started early; if it failed, try once more on our own
    (window.__quizData ?? load())
      .catch(() => load())
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  function start() {
    if (!data) return; // a restored (enabled) button before the menus have loaded must do nothing
    setAnswers([]);
    setCurrent(0);
    setStage("quiz");
    toTop();
  }

  function choose(answer: number) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = answer;
      return next;
    });
  }

  async function reveal() {
    if (!data || revealing) return;
    setRevealing(true);
    const letters = answers.map((a) => "ABCD"[a]).join("");
    const chosen = answers.map((a, qi) => QUESTIONS[qi].answers[a].tags);
    const roll = newRoll(); // a new roll gives different, equally good picks for the same answers
    // the scene is known now: choose a photo and start loading it while the picks are computed
    const nextScene = pickScene(buildProfile(chosen));
    const nextPhoto = pickPhoto(photosFor(nextScene), Math.random, photo?.scene === nextScene ? photo.id : undefined);
    if (nextPhoto) new Image().src = photoUrl(nextPhoto, 960);
    const delay = window.__QUIZ_DELAY_MS__ ?? 0; // test hook, set only by Playwright
    try {
      // The results state is set inside the work, so when the brewing screen hides the results are already
      // there (no one-frame flash of the last question).
      await runReveal(() => {
        setPicks(recommendSeeded(chosen, data, makeSeed(letters, roll)));
        setCharacter(pickCharacter(Math.random));
        setScene(nextScene);
        setPhoto(nextPhoto);
        setStage("result");
      }, setBrewing, delay);
      toTop();
    } finally {
      setRevealing(false);
    }
  }

  function next() {
    if (answers[current] === undefined || !data) return;
    if (current < QUESTIONS.length - 1) {
      setCurrent(current + 1);
      toTop();
    } else {
      void reveal();
    }
  }

  function back() {
    if (current > 0) setCurrent(current - 1);
  }

  return (
    <div className={`wrap ${stage === "result" && !brewing ? "wide" : ""}`}>
      <header className="site-header">
        <div className="brand">
          <div className="brand-badge">☕</div> Namma Coffee Test
        </div>
        <div className="city-stamp">ನಮ್ಮ ಬೆಂಗಳೂರು · 5600xx</div>
      </header>

      {brewing && <BrewingScreen cafeNames={data ? Object.keys(data.cafes) : []} coffeeCount={data ? data.coffees.length : 0} />}
      {!brewing && stage === "landing" && (
        <Landing
          onStart={start}
          ready={data !== null}
          failed={failed}
          cafeCount={data ? Object.keys(data.cafes).length : 0}
          coffeeCount={data ? data.coffees.length : 0}
        />
      )}
      {!brewing && stage === "quiz" && (
        <QuizQuestion index={current} selected={answers[current]} onChoose={choose} onBack={back} onNext={next} busy={revealing} />
      )}
      {!brewing && stage === "result" && <Results picks={picks} scene={scene} photo={photo} character={character} onRestart={start} onReroll={() => void reveal()} busy={revealing} />}

      <div className="footer">Menus gathered from public cafe listings in Oct 2026. A playful quiz, not a ranking.</div>
    </div>
  );
}
