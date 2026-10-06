import type { Pick } from "@/lib/scoring";
import type { ScenePhoto } from "@/lib/photos";
import { sceneById, type Character, type SceneId } from "@/lib/scenes";
import ResultScene from "./ResultScene";
import ResultCard from "./ResultCard";

interface Props {
  picks: Pick[];
  scene: SceneId;
  photo: ScenePhoto | null;
  character: Character;
  onRestart: () => void;
  onReroll: () => void;
  busy: boolean;
}

// Desktop: two columns (scene and actions on the left, three cards on the right).
// Tablet and phone: one column, the scene as a banner, actions in a sticky bar (see globals.css).
export default function Results({ picks, scene, photo, character, onRestart, onReroll, busy }: Props) {
  return (
    <section className="quiz-card results">
      <div className="results-grid">
        <aside className="results-side">
          <div className="tiny">Bengaluru personality detected</div>
          <h2>Your three coffees</h2>
          <ResultScene key={photo?.id ?? scene} scene={scene} photo={photo} character={character} />
          <p className="results-sub">{sceneById(scene).caption} Best match first, each from a different cafe.</p>
          <div className="results-actions">
            <button className="btn btn-primary" onClick={onReroll} disabled={busy}>
              Show different picks
            </button>
            <button className="btn btn-secondary" onClick={onRestart}>
              Take it again
            </button>
          </div>
        </aside>
        <div className="results-main">
          <div className="result-list">
            {picks.map((p) => (
              <ResultCard key={p.cafeName} pick={p} />
            ))}
          </div>
          <div className="footnote">Tags are worked out from menu wording and may be off.</div>
        </div>
      </div>
    </section>
  );
}
