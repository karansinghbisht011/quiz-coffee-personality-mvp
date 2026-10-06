// Landing illustration: filter-coffee tumbler and davara in the rain, with an auto on the road.
// Drawn as inline SVG so no image files or licences are involved.

import FilterCoffee from "./FilterCoffee";

const INK = "#25231f";

const RAIN = Array.from({ length: 22 }, (_, i) => ({
  x: 14 + ((i * 37) % 340),
  y: 10 + ((i * 53) % 150),
  len: 16 + (i % 3) * 6,
}));

export default function LandingArt() {
  return (
    <svg viewBox="0 0 360 380" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustration: a steel filter-coffee tumbler in the rain, with an auto-rickshaw passing by">
      <rect width="360" height="380" fill="var(--sky)" />
      {/* rain */}
      <g stroke="var(--rain)" strokeWidth="2" strokeLinecap="round" opacity="0.7">
        {RAIN.map((r, i) => (
          <line key={i} x1={r.x} y1={r.y} x2={r.x - 6} y2={r.y + r.len} />
        ))}
      </g>
      {/* flyover silhouette */}
      <path d="M0 250 Q180 205 360 250 L360 268 Q180 223 0 268Z" fill="var(--flyover)" stroke={INK} strokeWidth="2.5" />
      <rect x="70" y="248" width="14" height="50" fill="var(--flyover)" stroke={INK} strokeWidth="2.5" />
      <rect x="280" y="248" width="14" height="50" fill="var(--flyover)" stroke={INK} strokeWidth="2.5" />
      {/* road and puddle */}
      <rect y="298" width="360" height="82" fill="#8c867b" />
      <rect y="298" width="360" height="5" fill={INK} />
      <path d="M18 345h40M110 345h40M202 345h40M294 345h40" stroke="#f6f0e6" strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="205" cy="362" rx="60" ry="8" fill="var(--rain)" opacity="0.65" />
      {/* filter coffee set */}
      <FilterCoffee x={150} y={252} scale={1.2} steam />
      {/* auto-rickshaw */}
      <g transform="translate(196 268)">
        <path d="M6 40 L6 10 Q6 0 18 0 H96 Q104 0 108 10 L122 30 V40Z" fill="var(--auto)" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
        <path d="M0 4Q60 -14 114 4V12Q60 -4 0 12Z" fill={INK} />
        <rect x="18" y="12" width="48" height="18" rx="4" fill="#fffaf2" stroke={INK} strokeWidth="2.5" />
        <rect x="6" y="30" width="116" height="10" fill={INK} />
        <circle cx="26" cy="44" r="10" fill={INK} />
        <circle cx="26" cy="44" r="4" fill="#d6dadc" />
        <circle cx="104" cy="44" r="10" fill={INK} />
        <circle cx="104" cy="44" r="4" fill="#d6dadc" />
      </g>
    </svg>
  );
}
