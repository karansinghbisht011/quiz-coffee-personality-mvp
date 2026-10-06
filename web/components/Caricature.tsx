import type { Character, SceneId } from "@/lib/scenes";

// Our own caricature (design/caricature-research.md): a big head on a small body, wide expressive eyes,
// a big smile, one bold ink outline, flat colours, and a steel filter-coffee tumbler in hand. Pure SVG.
const INK = "#25231f";
const SKIN = ["#f1c9a5", "#e3ad86"];

type Accessory = "umbrella" | "cap" | "lanyard" | "headphones" | "camera" | "scarf" | "none";
const ACCESSORY: Record<SceneId, Accessory> = {
  auto: "scarf", "traffic-police": "cap", "traffic-jam": "headphones", weather: "umbrella",
  signal: "none", landmarks: "camera", "tech-park": "lanyard", "pov-cup": "none",
};

function Person({ kind, shirt, skin, accessory, mood }: { kind: "guy" | "girl"; shirt: string; skin: string; accessory: Accessory; mood: "happy" | "frazzled" }) {
  const hair = kind === "guy" ? INK : "#3a2418";
  return (
    <g stroke={INK} strokeWidth="3.2" strokeLinejoin="round" strokeLinecap="round">
      {/* umbrella behind everything */}
      {accessory === "umbrella" && (
        <g>
          <path d="M110 26 V150" strokeWidth="4" fill="none" />
          <path d="M40 66 Q110 -14 180 66 Q160 54 145 66 Q128 52 110 66 Q92 52 75 66 Q58 54 40 66Z" fill="var(--leaf)" />
        </g>
      )}
      {/* girl's back hair */}
      {kind === "girl" && <path d="M58 98 Q48 170 78 178 L90 110Z M162 98 Q172 170 142 178 L130 110Z" fill={hair} />}
      {/* neck: drawn before the body and head so both overlap its ends */}
      <path d="M95 130 V180 H125 V130Z" fill={skin} />
      <path d="M95 160 Q110 170 125 160" fill="none" strokeWidth="2.2" opacity="0.35" />
      {/* body */}
      <path d="M62 250 Q60 176 110 170 Q160 176 158 250Z" fill={shirt} />
      {accessory === "scarf" && <path d="M82 172 Q110 190 138 172 L134 190 Q110 204 86 190Z" fill="var(--auto)" />}
      {accessory === "lanyard" && (
        <g>
          <path d="M92 172 L108 214 M128 172 L112 214" fill="none" strokeWidth="2.5" />
          <rect x="98" y="212" width="24" height="18" rx="3" fill="#fffaf2" />
        </g>
      )}
      {accessory === "camera" && (
        <g>
          <rect x="84" y="206" width="36" height="24" rx="5" fill="#4b453f" />
          <circle cx="102" cy="218" r="7" fill="#cfe0e4" />
        </g>
      )}
      {/* ears, head */}
      <circle cx="62" cy="104" r="9" fill={skin} />
      <circle cx="158" cy="104" r="9" fill={skin} />
      <ellipse cx="110" cy="100" rx="48" ry="52" fill={skin} />
      {/* hair */}
      {kind === "guy" ? (
        <path d="M60 92 Q56 40 112 42 Q166 42 160 92 Q146 66 120 68 Q96 58 78 78 Q66 82 60 92Z" fill={hair} />
      ) : (
        <g>
          <path d="M58 96 Q54 40 110 40 Q166 40 162 96 Q140 62 110 66 Q80 62 58 96Z" fill={hair} />
          <circle cx="148" cy="46" r="13" fill={hair} />
          <circle cx="150" cy="40" r="7" fill="var(--gulmohar)" />
        </g>
      )}
      {accessory === "cap" && (
        <g>
          <path d="M62 70 Q110 24 158 70 Z" fill="#f7f3ea" />
          <path d="M60 70 H160 Q168 78 150 80 H70 Q54 78 60 70Z" fill="#25231f" />
        </g>
      )}
      {accessory === "headphones" && (
        <g>
          <path d="M62 100 Q60 44 110 44 Q160 44 158 100" fill="none" strokeWidth="6" />
          <rect x="52" y="92" width="16" height="30" rx="7" fill="#6f4a8e" />
          <rect x="152" y="92" width="16" height="30" rx="7" fill="#6f4a8e" />
        </g>
      )}
      {/* face: wide eyes with highlights, brows, nose, big smile, cheeks */}
      <ellipse cx="90" cy="100" rx="10" ry="12" fill="#fff" />
      <ellipse cx="130" cy="100" rx="10" ry="12" fill="#fff" />
      <circle cx="92" cy="102" r="5.5" fill={INK} stroke="none" />
      <circle cx="132" cy="102" r="5.5" fill={INK} stroke="none" />
      <circle cx="94" cy="99" r="1.8" fill="#fff" stroke="none" />
      <circle cx="134" cy="99" r="1.8" fill="#fff" stroke="none" />
      {mood === "happy" ? (
        <path d="M78 80 Q90 72 102 80 M118 80 Q130 72 142 80" fill="none" strokeWidth="3.5" />
      ) : (
        <path d="M78 76 L102 82 M142 76 L118 82" fill="none" strokeWidth="3.5" />
      )}
      <path d="M108 108 Q100 124 112 126" fill="none" strokeWidth="2.6" />
      <circle cx="74" cy="122" r="7" fill="var(--rose)" stroke="none" opacity="0.85" />
      <circle cx="146" cy="122" r="7" fill="var(--rose)" stroke="none" opacity="0.85" />
      {mood === "happy" ? (
        <g>
          <path d="M86 134 Q110 160 136 134 Q110 140 86 134Z" fill="#7a2f22" />
          <path d="M92 136 Q110 144 130 136 L128 141 Q110 148 94 141Z" fill="#fff" stroke="none" />
        </g>
      ) : (
        <path d="M92 142 Q110 132 130 142" fill="none" strokeWidth="3.5" />
      )}
      {/* arm and steel tumbler with davara, steam */}
      <path d="M144 190 Q176 184 176 156" fill="none" strokeWidth="14" stroke={INK} />
      <path d="M144 190 Q176 184 176 156" fill="none" strokeWidth="8" stroke={shirt} />
      <path d="M158 134 L164 172 Q179 178 194 172 L200 134Z" fill="#e3e7e9" />
      <path d="M159 148 Q179 154 199 148 M162 162 Q179 168 196 162" fill="none" strokeWidth="2" stroke="#7d868b" />
      <ellipse cx="179" cy="134" rx="21" ry="5" fill="#f3f5f6" />
      <ellipse cx="179" cy="134" rx="16" ry="3" fill="#6b452d" strokeWidth="2" />
      <circle cx="178" cy="172" r="9" fill={skin} />
      <path d="M170 150 l4 12" stroke="#fff" strokeWidth="3" fill="none" opacity="0.8" />
      <g fill="none" strokeWidth="2.6">
        <path d="M170 122 c-6 -8 6 -12 0 -22" />
        <path d="M186 122 c-6 -8 6 -12 0 -22" />
      </g>
    </g>
  );
}

export default function Caricature({ character, scene }: { character: Character; scene: SceneId }) {
  const acc = ACCESSORY[scene];
  const mood = scene === "traffic-jam" ? "frazzled" : "happy";
  const label = character === "both" ? "a guy and a girl" : character === "guy" ? "a guy" : "a girl";
  const two = character === "both";
  return (
    <svg className="caricature" viewBox={two ? "0 0 380 260" : "0 0 220 260"} role="img" aria-label={`Caricature of ${label} holding a steel filter-coffee tumbler`}>
      {two ? (
        <>
          <g transform="translate(-16 14) scale(0.94)"><Person kind="guy" shirt="var(--coffee)" skin={SKIN[0]} accessory={acc} mood={mood} /></g>
          <g transform="translate(396 14) scale(-0.94 0.94)"><Person kind="girl" shirt="var(--yellow)" skin={SKIN[1]} accessory="none" mood={mood} /></g>
        </>
      ) : (
        <Person kind={character === "guy" ? "guy" : "girl"} shirt={character === "guy" ? "var(--coffee)" : "var(--yellow)"} skin={character === "guy" ? SKIN[0] : SKIN[1]} accessory={acc} mood={mood} />
      )}
    </svg>
  );
}
