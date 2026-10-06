import { QUESTIONS } from "@/lib/questions";

interface Props {
  index: number;
  selected: number | undefined;
  onChoose: (answer: number) => void;
  onBack: () => void;
  onNext: () => void;
  busy?: boolean;
}

export default function QuizQuestion({ index, selected, onChoose, onBack, onNext, busy = false }: Props) {
  const q = QUESTIONS[index];
  const total = QUESTIONS.length;
  const last = index === total - 1;
  return (
    <section className="quiz-card">
      <div className="topline">
        <div className="progress-wrap" role="progressbar" aria-label="Quiz progress" aria-valuemin={1} aria-valuemax={total} aria-valuenow={index + 1} aria-valuetext={`Question ${index + 1} of ${total}`}>
          <div className="progress" style={{ width: `${((index + 1) / total) * 100}%` }} />
        </div>
        <div className="count">
          {index + 1} / {total}
        </div>
      </div>
      <div className="rangoli" aria-hidden="true">
        {QUESTIONS.map((_, i) => (
          <i key={i} className={i === index ? "now" : i < index ? "on" : ""} />
        ))}
      </div>
      <div className="tiny">{q.group}</div>
      <div className="question">{q.q}</div>
      <div className="options">
        {q.answers.map((a, i) => (
          <button key={a.label} className={`option ${selected === i ? "selected" : ""}`} onClick={() => onChoose(i)} aria-pressed={selected === i}>
            <div className="emoji">{a.emoji}</div>
            <div>
              <strong>{a.label}</strong>
              <span>{a.note}</span>
            </div>
          </button>
        ))}
      </div>
      <div className="actions">
        <button className="btn btn-secondary" onClick={onBack} disabled={index === 0}>
          ← Back
        </button>
        <button className="btn btn-primary" onClick={onNext} disabled={selected === undefined || busy}>
          {last ? "Reveal my coffees ☕" : "Next →"}
        </button>
      </div>
    </section>
  );
}
