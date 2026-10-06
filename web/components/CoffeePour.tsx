import type { CSSProperties } from "react";

// A looping loading animation: a steel tumbler tips and pours a thin stream of coffee into the dish below
// (the South Indian filter-coffee "pull"), the level rises, steam curls, then it starts again. Pure SVG and CSS
// keyframes (see globals.css, .coffee-pour); static, mid-pour, under reduced motion. Decorative: give the
// loading state a text alternative next to it.
const INK = "#25231f";

export default function CoffeePour({ className = "", style, x, y, width, height }: { className?: string; style?: CSSProperties; x?: number; y?: number; width?: number | string; height?: number | string }) {
  return (
    <svg className={`coffee-pour ${className}`} style={style} x={x} y={y} width={width} height={height} viewBox="0 0 160 110" aria-hidden="true" focusable="false">
      {/* dish (davara) */}
      <g stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M34 90 Q38 106 52 108 H108 Q122 106 126 90Z" fill="#c4c9cc" />
        <ellipse cx="80" cy="90" rx="46" ry="8" fill="#e9edee" />
        <ellipse className="pour-coffee" cx="80" cy="91" rx="37" ry="5.2" fill="#6b452d" strokeWidth="1.6" />
        <ellipse className="pour-froth" cx="80" cy="90.4" rx="26" ry="2.6" fill="#e8cfa6" stroke="none" />
      </g>
      {/* the stream */}
      <path className="pour-stream" d="M79 42 V88" stroke="#6b452d" strokeWidth="4.2" strokeLinecap="round" fill="none" />
      <path className="pour-stream pour-stream-flow" d="M79 42 V88" stroke="#c9915e" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      {/* the tumbler, tipping about its middle */}
      <g className="pour-tumbler" style={{ transformOrigin: "62px 42px" }} stroke={INK} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
        <path d="M51 24 L54 59 Q62 64 70 59 L73 24Z" fill="#e3e7e9" />
        <path d="M51 24 L54 59 Q58 61 60 62 L57 24Z" fill="#b9c0c4" stroke="none" />
        <path d="M52 38 Q62 42 72 38 M53 50 Q62 54 71 50" fill="none" stroke="#7d868b" strokeWidth="1.8" />
        <ellipse cx="62" cy="24" rx="11.5" ry="3.2" fill="#f3f5f6" />
        <ellipse cx="62" cy="24" rx="8.5" ry="1.9" fill="#6b452d" strokeWidth="1.4" />
      </g>
      {/* steam over the dish */}
      <g className="pour-steam" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round">
        <path d="M100 78 c-5 -6 5 -10 0 -17" /><path d="M112 80 c-5 -6 5 -10 0 -17" />
      </g>
    </svg>
  );
}
