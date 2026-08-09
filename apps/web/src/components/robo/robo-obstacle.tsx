import type { ObstacleKind } from "./robo-word-bank";

// Obstáculos desenhados (não emoji): cada tipo tem uma silhueta própria que
// já entrega qual ação ele pede, só de olhar -- uma cancela baixa pra pular,
// uma viga suspensa pra agachar embaixo, um raio flutuante pra desviar. Isso
// é a "lógica visível" que faltava: dá pra reconhecer o obstáculo de longe,
// não só ler um ícone pequeno.
export function RoboObstacle({ kind, size = 46 }: { kind: ObstacleKind; size?: number }) {
  return (
    <svg viewBox="0 0 40 44" width={size} height={size * 1.1} aria-hidden="true">
      {kind === "jump" ? <HurdleShape /> : kind === "door" ? <BeamShape /> : <SparkShape />}
    </svg>
  );
}

// Cancela baixa, listrada -- clássica de corrida com obstáculo. Fica no chão,
// então só dá pra passar pulando por cima.
function HurdleShape() {
  return (
    <g>
      <rect x="6" y="30" width="4" height="12" rx="1.5" fill="#78350f" />
      <rect x="30" y="30" width="4" height="12" rx="1.5" fill="#78350f" />
      <rect x="4" y="24" width="32" height="7" rx="2" fill="#f59e0b" />
      <rect x="4" y="24" width="8" height="7" fill="#fde68a" opacity="0.5" />
      <rect x="16" y="24" width="8" height="7" fill="#7c2d12" opacity="0.35" />
      <rect x="28" y="24" width="8" height="7" fill="#fde68a" opacity="0.5" />
    </g>
  );
}

// Viga suspensa numa altura de "cabeça" -- só dá pra passar agachando.
function BeamShape() {
  return (
    <g>
      <rect x="5" y="6" width="4" height="30" rx="1.5" fill="#0e7490" />
      <rect x="31" y="6" width="4" height="30" rx="1.5" fill="#0e7490" />
      <rect x="3" y="4" width="34" height="8" rx="3" fill="#22d3ee" />
      <rect x="3" y="4" width="34" height="3" rx="1.5" fill="#a5f3fc" opacity="0.6" />
    </g>
  );
}

// Faísca flutuante -- não tem base no chão nem barra alta, é um perigo solto
// no meio do caminho que se atravessa rápido (o "zap" já existente).
function SparkShape() {
  return (
    <g>
      <circle cx="20" cy="22" r="13" fill="#facc15" opacity="0.18" />
      <path
        d="M22 6 L11 24 L18 24 L15 38 L30 18 L22 18 Z"
        fill="#facc15"
        stroke="#a16207"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>
  );
}
