// South Indian filter coffee, drawn so it reads at a glance: a ridged steel tumbler (the "dabara") standing in
// its wide steel dish (the "davara"), a rolled rim, frothy coffee on top. Origin (0,0) is the middle of the
// dish's top rim; the tumbler rises to about y = -104 and the dish base is at about y = 40. Pure SVG.
const INK = "#25231f";

export default function FilterCoffee({ scale = 1, x = 0, y = 0, steam = false }: { scale?: number; x?: number; y?: number; steam?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} stroke={INK} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
      {/* davara: the wide dish, back rim and body */}
      <path d="M-66 0 Q-62 38 -40 42 H40 Q62 38 66 0Z" fill="#c4c9cc" />
      <ellipse cx="0" cy="0" rx="66" ry="11" fill="#e9edee" />
      <ellipse cx="0" cy="1" rx="54" ry="7" fill="#aab1b5" strokeWidth="2" />
      {/* tumbler body with side shading, two ridges and a highlight */}
      <path d="M-37 -104 L-30 -4 Q0 6 30 -4 L37 -104Z" fill="#e3e7e9" />
      <path d="M-37 -104 L-30 -4 Q-14 1 -6 2 L-12 -104Z" fill="#b9c0c4" stroke="none" />
      <path d="M-36 -72 Q0 -63 36 -72 M-34 -38 Q0 -29 34 -38" fill="none" stroke="#7d868b" strokeWidth="2.5" />
      <path d="M-24 -96 L-20 -24" fill="none" stroke="#fff" strokeWidth="5" opacity="0.85" />
      {/* rolled rim and frothy coffee */}
      <ellipse cx="0" cy="-104" rx="38" ry="8" fill="#f3f5f6" />
      <ellipse cx="0" cy="-104" rx="31" ry="5" fill="#6b452d" strokeWidth="2" />
      <ellipse cx="0" cy="-105" rx="24" ry="3" fill="#e8cfa6" stroke="none" />
      <circle cx="-8" cy="-105" r="1.6" fill="#fffaf2" stroke="none" /><circle cx="6" cy="-104" r="1.3" fill="#fffaf2" stroke="none" /><circle cx="14" cy="-106" r="1.1" fill="#fffaf2" stroke="none" />
      {/* davara front lip, in front of the tumbler's base */}
      <path d="M-66 0 Q0 24 66 0 Q0 13 -66 0Z" fill="#dfe3e5" />
      {steam && (
        <g className="brew-steam" fill="none">
          <path d="M-16 -118 c-8 -10 8 -16 0 -30" /><path d="M2 -120 c-8 -10 8 -16 0 -32" /><path d="M20 -118 c-8 -10 8 -16 0 -30" />
        </g>
      )}
    </g>
  );
}
