"use client";

import { useEffect, useState } from "react";
import CoffeePour from "./CoffeePour";

// Shown inside the scene frame while a photo loads: an auto-rickshaw on a wavy road, a steaming tumbler,
// and rotating playful lines. Pure SVG and CSS; static under reduced motion.
const LINES = ["Finding your Bengaluru scene…", "Waiting at the signal…", "Brewing the filter…"];

export default function DoodleLoader() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LINES.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="doodle-loader" role="status" aria-live="polite" aria-label="Loading the scene photo">
      <svg viewBox="0 0 320 170" aria-hidden="true">
        <rect width="320" height="170" fill="var(--sky)" />
        <path d="M0 126 Q40 112 80 126 T160 126 T240 126 T320 126 V170 H0Z" fill="#8c867b" stroke="#25231f" strokeWidth="3" />
        <CoffeePour x={104} y={22} width={112} height={77} />
        <g className="brew-auto" stroke="#25231f" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M6 100 V84 Q6 76 14 76 H48 Q54 76 58 84 L66 98 V108H6Z" fill="var(--auto)" />
          <circle cx="18" cy="112" r="8" fill="#25231f" /><circle cx="54" cy="112" r="8" fill="#25231f" />
        </g>
      </svg>
      <p>{LINES[i]}</p>
    </div>
  );
}
