import type { GameSlug } from "./game-identity";

// Dioramas: uma cena minúscula e viva de CADA mecânica, pra dar pra entender
// o jogo de longe sem ler nada. É o elemento assinatura do arcade.
//
// Tudo é SVG + CSS (nenhum JS, nenhum hook) por dois motivos: mantém estes
// componentes como Server Components, e atende o princípio de "leveza" do
// briefing -- laboratório com máquina modesta não pode engasgar num hub.
// As animações usam `motion-safe:`, então quem pede menos movimento no
// sistema recebe a cena parada, sem quebrar o layout.

const FIELD = "0 0 100 60";

// O container é sempre mais largo que o viewBox, então o SVG é recortado na
// vertical. Ancorar embaixo (YMax) mantém visível o que importa em cada cena:
// a base, o chão, o escudo. Só o Ritmo é centrado -- lá o anel PULSA no meio.
const ANCHOR_BOTTOM = "xMidYMax slice";
const ANCHOR_CENTER = "xMidYMid slice";

// Em SVG, o transform-origin padrão é a origem do viewBox, não o centro do
// próprio elemento -- então um rotate() joga a figura longe em vez de girá-la
// no lugar. fill-box + center faz o giro acontecer onde a gente espera.
const SPIN_IN_PLACE = {
  transformBox: "fill-box",
  transformOrigin: "center",
} as const;

function Stars({ glow }: { glow: string }) {
  const stars = [
    [12, 10],
    [30, 20],
    [52, 8],
    [74, 16],
    [88, 30],
    [20, 40],
    [64, 44],
  ];
  return (
    <>
      {stars.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={0.8}
          fill={glow}
          opacity={0.5}
          className="motion-safe:animate-[arcade-twinkle_3s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </>
  );
}

function OrbitalArt({ glow }: { glow: string }) {
  return (
    <svg viewBox={FIELD} className="h-full w-full" preserveAspectRatio={ANCHOR_BOTTOM} aria-hidden="true">
      <Stars glow={glow} />
      {[
        { x: 22, delay: 0 },
        { x: 52, delay: 1.1 },
        { x: 76, delay: 2.2 },
      ].map((w, i) => (
        <g
          key={i}
          className="motion-safe:animate-[arcade-descend_3.3s_linear_infinite]"
          style={{ animationDelay: `${w.delay}s` }}
        >
          <rect x={w.x - 9} y={0} width={18} height={7} rx={3.5} fill={glow} opacity={0.22} />
          <rect x={w.x - 9} y={0} width={18} height={7} rx={3.5} fill="none" stroke={glow} strokeWidth={0.6} />
        </g>
      ))}
      <line
        x1={50}
        y1={44}
        x2={50}
        y2={28}
        stroke={glow}
        strokeWidth={1.4}
        strokeLinecap="round"
        className="motion-safe:animate-[arcade-beam_1.6s_ease-out_infinite]"
      />
      <path d="M50 44 L57 54 L50 51 L43 54 Z" fill={glow} />
    </svg>
  );
}

function RoboArt({ glow }: { glow: string }) {
  return (
    <svg viewBox={FIELD} className="h-full w-full" preserveAspectRatio={ANCHOR_BOTTOM} aria-hidden="true">
      <line x1={0} y1={46} x2={100} y2={46} stroke={glow} strokeWidth={0.8} opacity={0.45} />
      {[0, 1, 2].map((i) => (
        <rect
          key={i}
          x={100}
          y={38}
          width={5}
          height={8}
          rx={1}
          fill={glow}
          opacity={0.45}
          className="motion-safe:animate-[arcade-slide-left_2.4s_linear_infinite]"
          style={{ animationDelay: `${i * 0.8}s` }}
        />
      ))}
      <g className="motion-safe:animate-[arcade-hop_1.2s_ease-in-out_infinite]">
        <rect x={20} y={30} width={16} height={16} rx={5} fill={glow} />
        <circle cx={25.5} cy={37} r={1.9} fill="#0b1026" />
        <circle cx={30.5} cy={37} r={1.9} fill="#0b1026" />
      </g>
      <rect x={86} y={26} width={2} height={20} fill={glow} opacity={0.7} />
      <path d="M88 26 L96 29 L88 32 Z" fill={glow} opacity={0.7} />
    </svg>
  );
}

function ChuvaArt({ glow }: { glow: string }) {
  return (
    <svg viewBox={FIELD} className="h-full w-full" preserveAspectRatio={ANCHOR_BOTTOM} aria-hidden="true">
      {[6, 18, 30, 42, 54, 66, 78, 90].map((x, i) => (
        <line
          key={i}
          x1={x}
          y1={-8}
          x2={x - 5}
          y2={4}
          stroke={glow}
          strokeWidth={0.9}
          opacity={0.6}
          strokeLinecap="round"
          className="motion-safe:animate-[arcade-rain_1.4s_linear_infinite]"
          style={{ animationDelay: `${i * 0.17}s` }}
        />
      ))}
      {[
        { x: 26, delay: 0 },
        { x: 58, delay: 0.9 },
      ].map((d, i) => (
        <g
          key={i}
          className="motion-safe:animate-[arcade-descend_2.8s_linear_infinite]"
          style={{ animationDelay: `${d.delay}s` }}
        >
          <rect x={d.x - 10} y={0} width={20} height={7} rx={3.5} fill={glow} opacity={0.25} />
          <rect x={d.x - 10} y={0} width={20} height={7} rx={3.5} fill="none" stroke={glow} strokeWidth={0.6} />
        </g>
      ))}
      <rect x={0} y={52} width={100} height={8} fill={glow} opacity={0.22} />
      <line x1={0} y1={52} x2={100} y2={52} stroke={glow} strokeWidth={1} />
    </svg>
  );
}

function SaladaArt({ glow }: { glow: string }) {
  // Três frutas descrevendo parábolas (o arremesso do jogo) e uma bomba que
  // sobe junto -- a cena conta a regra inteira sem uma palavra: corte a fruta,
  // deixe a bomba passar.
  // O container corta o viewBox: na tela de título só aparece a faixa de
  // baixo (y ≈ 38-60). Toda a cena vive dentro dessa faixa, senão a ação
  // acontece fora do que o aluno consegue ver.
  const arcs = [
    { cx: 24, delay: 0, r: 5 },
    { cx: 52, delay: 1.05, r: 6 },
    { cx: 78, delay: 2.1, r: 4.5 },
  ];
  return (
    <svg viewBox={FIELD} className="h-full w-full" preserveAspectRatio={ANCHOR_BOTTOM} aria-hidden="true">
      {arcs.map((a, i) => (
        <g
          key={i}
          className="motion-safe:animate-[arcade-toss_3.1s_ease-out_infinite]"
          style={{ animationDelay: `${a.delay}s`, ...SPIN_IN_PLACE }}
        >
          <circle cx={a.cx} cy={60} r={a.r} fill={glow} opacity={0.95} />
          <circle cx={a.cx} cy={60} r={a.r} fill="none" stroke="#fff" strokeWidth={0.5} opacity={0.4} />
          <circle cx={a.cx - a.r * 0.35} cy={60 - a.r * 0.4} r={a.r * 0.22} fill="#fff" opacity={0.45} />
        </g>
      ))}

      {/* Bomba: escura, com pavio aceso -- inconfundível, é o ponto do jogo. */}
      <g
        className="motion-safe:animate-[arcade-toss_3.1s_ease-out_infinite]"
        style={{ animationDelay: "1.6s", ...SPIN_IN_PLACE }}
      >
        <circle cx={39} cy={60} r={5} fill="#180409" stroke="#fb7185" strokeWidth={1} />
        <line x1={41.5} y1={56} x2={44} y2={53.5} stroke="#fb7185" strokeWidth={0.9} strokeLinecap="round" />
        <circle cx={44.6} cy={52.9} r={1.3} fill="#fbbf24" />
      </g>

      {/* Risco do corte, dentro da faixa visível. */}
      <line
        x1={16}
        y1={40}
        x2={64}
        y2={31}
        stroke="#fff"
        strokeWidth={1.1}
        strokeLinecap="round"
        opacity={0.85}
        className="motion-safe:animate-[arcade-swipe_3.1s_ease-in-out_infinite]"
      />
    </svg>
  );
}

function RitmoArt({ glow }: { glow: string }) {
  return (
    <svg viewBox={FIELD} className="h-full w-full" preserveAspectRatio={ANCHOR_CENTER} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <circle
          key={i}
          cx={50}
          cy={30}
          r={11}
          fill="none"
          stroke={glow}
          strokeWidth={1.1}
          className="motion-safe:animate-[arcade-ripple_2.1s_ease-out_infinite]"
          style={{ animationDelay: `${i * 0.7}s`, transformOrigin: "50px 30px" }}
        />
      ))}
      <circle
        cx={50}
        cy={30}
        r={7}
        fill={glow}
        className="motion-safe:animate-[arcade-thump_2.1s_ease-in-out_infinite]"
        style={{ transformOrigin: "50px 30px" }}
      />
      {[16, 28, 72, 84].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={26}
          width={3}
          height={8}
          rx={1.5}
          fill={glow}
          opacity={0.45}
          className="motion-safe:animate-[arcade-bar_2.1s_ease-in-out_infinite]"
          style={{ animationDelay: `${i * 0.12}s`, transformOrigin: `${x + 1.5}px 30px` }}
        />
      ))}
    </svg>
  );
}

const ART: Record<GameSlug, (props: { glow: string }) => React.ReactElement> = {
  orbital: OrbitalArt,
  robo: RoboArt,
  chuva: ChuvaArt,
  salada: SaladaArt,
  ritmo: RitmoArt,
};

export function GameArt({ slug, glow }: { slug: GameSlug; glow: string }) {
  const Scene = ART[slug];
  return <Scene glow={glow} />;
}
