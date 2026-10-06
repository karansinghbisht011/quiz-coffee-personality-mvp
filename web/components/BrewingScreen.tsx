"use client";

import { useEffect, useMemo, useState } from "react";
import { mulberry32 } from "@/lib/rng";
import FilterCoffee from "./FilterCoffee";

// Shown only when the recommendation is slow (lib/reveal.ts). An auto-rickshaw on a rainy road,
// a steaming filter-coffee set, a progress bar, and a departure board of real cafe names.
// Pure SVG and CSS; static under reduced motion. The captions describe what the engine does,
// in order, and advance with time while the work finishes.

const CAPTIONS = [
  "Reading your 9 answers",
  "Weighing every coffee",
  "Checking each cafe's vibe",
  "Picking your best match, a close one and a wildcard",
  "Plating up",
];
const INK = "#25231f";

interface Props {
  cafeNames: string[];
  coffeeCount: number;
}

export default function BrewingScreen({ cafeNames, coffeeCount }: Props) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const t0 = Date.now();
    const id = setInterval(() => setMs(Date.now() - t0), 120);
    return () => clearInterval(id);
  }, []);

  const board = useMemo(() => {
    const r = mulberry32(coffeeCount || 7);
    const names = [...cafeNames];
    for (let i = names.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1));
      [names[i], names[j]] = [names[j], names[i]];
    }
    return names.slice(0, 60);
  }, [cafeNames, coffeeCount]);

  const step = Math.min(CAPTIONS.length - 1, Math.floor(ms / 650));
  const fill = Math.min(0.92, 0.08 + ms / 2600); // never reaches 100%: it ends when the results are ready
  const rows = [0, 1, 2].map((k) => board[(Math.floor(ms / 420) * 3 + k) % Math.max(1, board.length)] ?? "");
  const caption = step === 1 ? `Weighing ${coffeeCount.toLocaleString("en-IN")} coffees` : CAPTIONS[step];

  return (
    <section className="quiz-card brewing" role="status" aria-live="polite" aria-label="Finding your coffees">
      <div className="brew-scene" aria-hidden="true">
        <svg viewBox="0 0 360 170">
          <rect width="360" height="170" fill="var(--sky)" />
          <g className="brew-rain" stroke="var(--rain)" strokeWidth="2" strokeLinecap="round">
            {Array.from({ length: 18 }, (_, i) => (
              <line key={i} x1={14 + i * 20} y1={4 + ((i * 37) % 60)} x2={8 + i * 20} y2={20 + ((i * 37) % 60)} />
            ))}
          </g>
          <path d="M0 108 Q180 78 360 108 L360 118 Q180 88 0 118Z" fill="var(--flyover)" stroke={INK} strokeWidth="2" />
          <rect y="136" width="360" height="34" fill="#8c867b" />
          <rect y="136" width="360" height="3" fill={INK} />
          <FilterCoffee x={180} y={92} scale={0.82} steam />
          {/* auto-rickshaw driving across */}
          <g className="brew-auto">
            <path d="M6 40 L6 12 Q6 2 16 2 H66 Q74 2 78 10 L90 28 V40Z" fill="var(--auto)" stroke={INK} strokeWidth="2.5" strokeLinejoin="round" transform="translate(0 100)" />
            <rect x="14" y="112" width="34" height="14" rx="3" fill="#fffaf2" stroke={INK} strokeWidth="2" />
            <circle cx="22" cy="142" r="8" fill={INK} />
            <circle cx="78" cy="142" r="8" fill={INK} />
          </g>
        </svg>
      </div>
      <div className="brew-board" aria-hidden="true">
        {rows.map((name, i) => (
          <div key={`${i}-${name}`} className="brew-row">
            <span className="brew-no">{String(i + 1).padStart(2, "0")}</span>
            <span className="brew-name">{name}</span>
          </div>
        ))}
      </div>
      <div className="brew-meter" aria-hidden="true">
        <div className="brew-meter-fill" style={{ width: `${Math.round(fill * 100)}%` }} />
      </div>
      <p className="brew-caption">{caption}…</p>
    </section>
  );
}
