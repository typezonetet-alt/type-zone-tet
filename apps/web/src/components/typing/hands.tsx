import { FINGER_COLOR, FINGER_LABEL, type FingerId } from "./finger-map";

type Slot = "thumb" | "index" | "middle" | "ring" | "pinky";

interface FingerGeometry {
  slot: Slot;
  base: [number, number];
  tip: [number, number];
  width: number;
}

// Geometria de uma mao (lado direito), espelhada em runtime pra virar a esquerda.
// Vetorial e simplificada de proposito (docs/briefing.md secao 10: nao precisa
// reproduzir maos realistas), estilo "silhueta" consistente com o design system.
const FINGERS: FingerGeometry[] = [
  { slot: "thumb", base: [55, 128], tip: [20, 100], width: 18 },
  { slot: "index", base: [78, 108], tip: [66, 50], width: 16 },
  { slot: "middle", base: [95, 105], tip: [95, 34], width: 16 },
  { slot: "ring", base: [112, 107], tip: [119, 45], width: 15 },
  { slot: "pinky", base: [128, 113], tip: [142, 66], width: 13 },
];

const SLOT_TO_FINGER: Record<"left" | "right", Record<Slot, FingerId>> = {
  right: {
    thumb: "thumbs",
    index: "R-index",
    middle: "R-middle",
    ring: "R-ring",
    pinky: "R-pinky",
  },
  left: {
    thumb: "thumbs",
    index: "L-index",
    middle: "L-middle",
    ring: "L-ring",
    pinky: "L-pinky",
  },
};

function Hand({ side, activeFinger }: { side: "left" | "right"; activeFinger: FingerId | null }) {
  const transform = side === "right" ? "translate(210, 0)" : "translate(190, 0) scale(-1, 1)";

  return (
    <g transform={transform}>
      <ellipse cx={95} cy={136} rx={50} ry={32} fill="var(--color-muted)" />
      {FINGERS.map((finger) => {
        const fingerId = SLOT_TO_FINGER[side][finger.slot];
        const isActive = fingerId === activeFinger;
        return (
          <g key={finger.slot}>
            <line
              x1={finger.base[0]}
              y1={finger.base[1]}
              x2={finger.tip[0]}
              y2={finger.tip[1]}
              strokeWidth={finger.width}
              strokeLinecap="round"
              stroke={isActive ? FINGER_COLOR[fingerId] : "var(--color-border)"}
              className="transition-[stroke] duration-150"
            />
            {isActive ? (
              <circle
                cx={finger.tip[0]}
                cy={finger.tip[1]}
                r={finger.width * 0.6}
                fill={FINGER_COLOR[fingerId]}
                stroke="var(--color-card)"
                strokeWidth={2.5}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}

export interface HandsProps {
  activeFinger: FingerId | null;
}

export function Hands({ activeFinger }: HandsProps) {
  const caption =
    activeFinger === "thumbs"
      ? "Use os polegares"
      : activeFinger
        ? `Use o ${FINGER_LABEL[activeFinger]}`
        : "";

  return (
    <div className="flex flex-col items-center gap-1.5">
      <svg viewBox="0 0 400 170" className="h-24 w-auto sm:h-28" aria-hidden="true">
        <Hand side="left" activeFinger={activeFinger} />
        <Hand side="right" activeFinger={activeFinger} />
      </svg>
      <p className="h-4 text-xs text-[var(--color-muted-foreground)]" aria-live="polite">
        {caption}
      </p>
    </div>
  );
}
