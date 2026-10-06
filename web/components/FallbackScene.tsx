import type { SceneId } from "@/lib/scenes";

// Our own drawn scene per scene id: shown when a photo cannot load (or none is approved). 640x400, flat, warm.
const INK = "#25231f";
const stroke = { stroke: INK, strokeWidth: 3, strokeLinejoin: "round" as const };

function Ground({ y = 290 }: { y?: number }) {
  return (
    <>
      <rect y={y} width="640" height={400 - y} fill="#8c867b" />
      <rect y={y} width="640" height="4" fill={INK} />
      <path d={`M30 ${y + 50}h60M170 ${y + 50}h60M310 ${y + 50}h60M450 ${y + 50}h60`} stroke="#f6f0e6" strokeWidth="5" strokeLinecap="round" />
    </>
  );
}
const Rain = ({ n = 26 }: { n?: number }) => (
  <g stroke="var(--rain)" strokeWidth="2.5" strokeLinecap="round" opacity="0.8">
    {Array.from({ length: n }, (_, i) => <line key={i} x1={20 + ((i * 53) % 610)} y1={10 + ((i * 71) % 230)} x2={13 + ((i * 53) % 610)} y2={32 + ((i * 71) % 230)} />)}
  </g>
);
const Car = ({ x, y, c }: { x: number; y: number; c: string }) => (
  <g transform={`translate(${x} ${y})`} {...stroke}>
    <path d="M0 44 V26 Q0 16 12 14 L34 0 H78 L98 14 Q112 16 112 28 V44Z" fill={c} />
    <path d="M40 6 H76 L90 16 H34Z" fill="#cfe0e4" />
    <circle cx="26" cy="46" r="11" fill={INK} /><circle cx="88" cy="46" r="11" fill={INK} />
    <rect x="104" y="26" width="8" height="7" fill="#d9642b" stroke="none" />
  </g>
);

const SCENES: Record<SceneId, React.ReactNode> = {
  auto: (
    <>
      <Ground />
      <g transform="translate(150 150) scale(1.9)" {...stroke}>
        <path d="M6 40 L6 10 Q6 0 18 0 H96 Q104 0 108 10 L122 30 V40Z" fill="var(--auto)" />
        <path d="M0 4Q60 -14 114 4V12Q60 -4 0 12Z" fill={INK} />
        <rect x="18" y="12" width="48" height="18" rx="4" fill="#fffaf2" strokeWidth="2.5" />
        <rect x="6" y="30" width="116" height="10" fill={INK} />
        <circle cx="26" cy="44" r="10" fill={INK} /><circle cx="104" cy="44" r="10" fill={INK} />
      </g>
    </>
  ),
  "traffic-police": (
    <>
      <Ground />
      {[60, 150, 240, 330, 420, 510].map((x) => <rect key={x} x={x} y="318" width="56" height="12" fill="#f6f0e6" stroke="none" />)}
      <g transform="translate(250 60)" {...stroke}>
        <path d="M30 250 Q26 160 80 150 Q134 160 130 250Z" fill="#f7f3ea" />
        <ellipse cx="80" cy="98" rx="42" ry="46" fill="#e3ad86" />
        <path d="M34 78 Q80 24 126 78 Z" fill="#f7f3ea" /><path d="M32 78 H128 Q136 86 118 88 H44 Q26 86 32 78Z" fill={INK} />
        <ellipse cx="64" cy="100" rx="8" ry="10" fill="#fff" /><ellipse cx="96" cy="100" rx="8" ry="10" fill="#fff" />
        <circle cx="66" cy="102" r="4.5" fill={INK} stroke="none" /><circle cx="98" cy="102" r="4.5" fill={INK} stroke="none" />
        <path d="M60 128 Q80 146 100 128" fill="none" />
        <path d="M120 170 L190 90" fill="none" strokeWidth="16" stroke={INK} /><path d="M120 170 L190 90" fill="none" strokeWidth="10" stroke="#f7f3ea" />
        <rect x="184" y="52" width="34" height="46" rx="10" fill="#e3ad86" transform="rotate(20 200 75)" />
      </g>
    </>
  ),
  "traffic-jam": (
    <>
      <path d="M0 150 Q320 90 640 150 V170 Q320 110 0 170Z" fill="var(--flyover)" {...stroke} />
      <Ground y={230} />
      <Car x={20} y={250} c="#d9642b" /><Car x={170} y={250} c="#6f4a8e" /><Car x={320} y={250} c="#f2c230" /><Car x={470} y={250} c="#4f6648" />
      <Car x={90} y={180} c="#e9edee" /><Car x={250} y={180} c="#6b452d" /><Car x={410} y={180} c="#8a9aa6" />
    </>
  ),
  weather: (
    <>
      <Ground y={300} />
      <g fill="#aeb9c0" {...stroke}>
        <path d="M60 130 Q60 80 120 84 Q140 40 200 62 Q250 40 280 90 Q330 90 326 130Z" />
        <path d="M300 160 Q300 110 360 114 Q380 70 440 92 Q490 70 520 120 Q570 120 566 160Z" />
      </g>
      <Rain n={40} />
      <ellipse cx="320" cy="350" rx="150" ry="14" fill="var(--rain)" opacity="0.7" />
    </>
  ),
  signal: (
    <>
      <Ground />
      {[60, 150, 240, 330, 420, 510].map((x) => <rect key={x} x={x} y="322" width="56" height="12" fill="#f6f0e6" stroke="none" />)}
      <g {...stroke}>
        <rect x="300" y="40" width="26" height="230" fill="#4b453f" />
        <rect x="276" y="30" width="74" height="136" rx="14" fill={INK} />
        <circle cx="313" cy="62" r="18" fill="#d33a2c" /><circle cx="313" cy="98" r="18" fill="#5a4a22" /><circle cx="313" cy="134" r="18" fill="#2d4a2a" />
      </g>
      <Car x={60} y={226} c="#f2c230" /><Car x={440} y={226} c="#6f4a8e" />
    </>
  ),
  landmarks: (
    <>
      <Ground y={310} />
      <g {...stroke}>
        <rect x="120" y="190" width="400" height="120" fill="#e6cf9a" />
        {[150, 190, 230, 270, 310, 350, 390, 430, 470].map((x) => <rect key={x} x={x} y="205" width="16" height="105" fill="#f4e6bd" />)}
        <path d="M250 190 Q320 70 390 190Z" fill="#d6b97a" /><rect x="312" y="40" width="16" height="50" fill="#d6b97a" />
        <path d="M328 42 h48 v22 h-48Z" fill="#d9642b" stroke="none" />
        <rect x="270" y="150" width="100" height="44" fill="#e6cf9a" />
      </g>
      <circle cx="70" cy="270" r="44" fill="#4f6648" {...stroke} /><circle cx="580" cy="270" r="44" fill="#4f6648" {...stroke} />
    </>
  ),
  "tech-park": (
    <>
      <Ground y={320} />
      {[[60, 120, 130, 200, "#8fb3c4"], [210, 60, 150, 260, "#7aa0b4"], [380, 100, 120, 220, "#a8c6d3"], [510, 150, 100, 170, "#8fb3c4"]].map(([x, y, w, h, c]) => (
        <g key={String(x)} {...stroke}>
          <rect x={x as number} y={y as number} width={w as number} height={h as number} fill={c as string} />
          {Array.from({ length: Math.floor((h as number) / 28) }, (_, r) => <path key={r} d={`M${x} ${(y as number) + 14 + r * 28}h${w}`} stroke="#fffaf2" strokeWidth="3" />)}
        </g>
      ))}
      <circle cx="40" cy="300" r="26" fill="#4f6648" {...stroke} />
    </>
  ),
  "pov-cup": (
    <>
      <rect x="40" y="30" width="560" height="260" rx="14" fill="#cfe0e4" {...stroke} />
      <Rain n={22} />
      <path d="M40 200 Q160 150 320 190 T600 170 V290 H40Z" fill="#b8b2a7" opacity="0.8" stroke="none" />
      <path d="M320 30 V290 M40 160 H600" stroke={INK} strokeWidth="6" />
      <rect x="20" y="290" width="600" height="30" rx="8" fill="#8a5a3a" {...stroke} />
      <g {...stroke}>
        <path d="M250 190 H350 L336 290 H264Z" fill="#dfe3e5" /><path d="M244 190 H356" strokeWidth="6" />
        <path d="M224 290 H376 L364 318 H236Z" fill="#c4c9cc" />
      </g>
    </>
  ),
};

export default function FallbackScene({ scene }: { scene: SceneId }) {
  return (
    <svg className="fallback-scene" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice" role="img" aria-label={`Drawn illustration for the ${scene.replace("-", " ")} scene`}>
      <rect width="640" height="400" fill="var(--sky)" />
      {SCENES[scene]}
    </svg>
  );
}
