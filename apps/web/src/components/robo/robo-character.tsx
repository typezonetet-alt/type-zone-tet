// Personagem desenhado (não emoji): cabeça com viseira, tronco com brilho,
// braços/pernas em cápsula que se articulam de verdade em torno do quadril
// e do ombro. O transform-origin de cada membro é um ponto FIXO do viewBox
// (comportamento padrão de SVG), não o centro do próprio elemento -- é
// exatamente o pivô que uma perna/braço de verdade precisa ter.

const GAIT_MS = 380;
const JUMP_HEIGHT_PX = 64;
/** Fração do pulo gasta subindo. Menor que a metade = sobe rápido, cai devagar. */
const RISE_SHARE = 0.42;

const BODY = "#60a5fa";
const BODY_DARK = "#2563eb";
const LIMB = "#1d4ed8";
const LIMB_SHADE = "#1e3a8a";
const VISOR = "#0b1226";
const EYE = "#a5f3fc";
const ACCENT = "#fde047";

/**
 * Altura do pulo (0→1) a partir do progresso (0→1).
 *
 * Uma parábola simples (4p(1-p)) é simétrica e fica "flutuante" -- sobe e
 * desce no mesmo ritmo, o que não parece um pulo. Aqui a subida é rápida e
 * a queda é mais longa, com o topo suave: é o que dá a sensação de peso.
 */
function jumpHeight(p: number): number {
  if (p < RISE_SHARE) return Math.sin((p / RISE_SHARE) * (Math.PI / 2));
  return Math.cos(((p - RISE_SHARE) / (1 - RISE_SHARE)) * (Math.PI / 2));
}

/** Agachar: desce rápido, segura embaixo, e volta -- sem "elástico". */
function crouchAmount(p: number): number {
  if (p < 0.22) return p / 0.22;
  if (p < 0.68) return 1;
  return 1 - (p - 0.68) / 0.32;
}

export function RoboCharacter({
  jumpProgress,
  stumbling,
  ducking,
  size = 56,
  reducedEffects = false,
}: {
  /** 0→1 durante a ação; null quando está no chão correndo. */
  jumpProgress: number | null;
  stumbling: boolean;
  /** Passar por baixo da viga: em vez de subir, se agacha. */
  ducking: boolean;
  size?: number;
  reducedEffects?: boolean;
}) {
  const airborne = jumpProgress !== null;
  const jumping = airborne && !ducking;
  const crouching = airborne && ducking;

  const lift = jumping ? jumpHeight(jumpProgress) * JUMP_HEIGHT_PX : 0;
  const crouch = crouching ? crouchAmount(jumpProgress) : 0;

  // Esticar no ar e achatar na decolagem/aterrissagem (squash & stretch) --
  // é o que tira a sensação de "bloco subindo reto".
  const stretch = jumping ? 1 + Math.sin(jumpProgress * Math.PI) * 0.06 : 1;

  // Corre no lugar sempre que está no chão -- é a pista que passa por baixo.
  // O atraso vai DENTRO do shorthand `animation` (e não num `animationDelay`
  // separado): misturar shorthand com longhand da mesma propriedade faz o
  // React avisar de conflito, e o valor longhand pode ser perdido no
  // re-render -- o que travaria as duas pernas em fase, sem passada.
  const gaiting = !reducedEffects && !airborne;
  const gait = (delayMs: number) =>
    gaiting ? `robo-leg-swing ${GAIT_MS}ms ease-in-out ${delayMs}ms infinite` : "none";
  const legAnim = gait(0);
  const legAnimOffset = gait(-GAIT_MS / 2);

  // Pernas: recolhidas no pulo, dobradas pra fora no agachamento.
  const legAngle = jumping ? 38 * jumpHeight(jumpProgress) : crouching ? 62 * crouch : 0;
  const armAngle = jumping ? -30 * jumpHeight(jumpProgress) : crouching ? 42 * crouch : 0;
  // Agachado, o corpo inteiro desce: as pernas encolhem e o tronco acompanha.
  const bodyDrop = crouch * 13;
  const legSquash = 1 - crouch * 0.55;
  const lean = jumping ? 8 * jumpHeight(jumpProgress) : crouching ? 12 * crouch : 0;

  return (
    <div className="relative" style={{ width: size, height: size * 1.1 }} aria-hidden="true">
      {/* Sombra no chão: encolhe conforme sobe, alarga ao agachar. */}
      <div
        className="absolute bottom-0 left-1/2 h-1.5 -translate-x-1/2 rounded-full bg-black/40 blur-[1px]"
        style={{
          width: size * (0.55 - (lift / JUMP_HEIGHT_PX) * 0.3 + crouch * 0.12),
          opacity: 0.7 - (lift / JUMP_HEIGHT_PX) * 0.4,
        }}
      />
      <div
        className="absolute inset-x-0 top-0"
        style={{
          transform: `translateY(${-lift}px)`,
          animation: reducedEffects
            ? "none"
            : stumbling
              ? "robo-stumble-shake 420ms ease-out"
              : airborne
                ? "none"
                : `robo-run-bob ${GAIT_MS}ms ease-in-out infinite`,
        }}
      >
        <svg
          viewBox="0 0 44 52"
          width={size}
          height={size * 1.1}
          style={{
            transform: `scaleY(${stretch}) rotate(${lean}deg)`,
            transformOrigin: "bottom center",
          }}
        >
          {/* Quadril pra baixo: as pernas encurtam de verdade ao agachar
              (scaleY só nelas), em vez de achatar o personagem inteiro. */}
          <g style={{ transform: `translateY(${bodyDrop}px)` }}>
            {/* perna esquerda */}
            <g
              style={{
                transformOrigin: "16px 35px",
                animation: legAnimOffset,
                transform: gaiting ? undefined : `rotate(${legAngle}deg) scaleY(${legSquash})`,
              }}
            >
              <rect x="12.5" y="35" width="7" height="14" rx="3.5" fill={LIMB} />
              <ellipse cx="16" cy="48" rx="4" ry="2" fill={LIMB_SHADE} />
            </g>
            {/* perna direita */}
            <g
              style={{
                transformOrigin: "28px 35px",
                animation: legAnim,
                transform: gaiting ? undefined : `rotate(${-legAngle}deg) scaleY(${legSquash})`,
              }}
            >
              <rect x="24.5" y="35" width="7" height="14" rx="3.5" fill={LIMB} />
              <ellipse cx="28" cy="48" rx="4" ry="2" fill={LIMB_SHADE} />
            </g>

            {/* tronco com brilho */}
            <rect x="9" y="17" width="26" height="20" rx="9" fill={BODY_DARK} />
            <rect x="12" y="19" width="10" height="7" rx="3.5" fill={BODY} opacity="0.55" />
            <circle cx="22" cy="29" r="3" fill={ACCENT} opacity="0.9" />

            {/* braço esquerdo */}
            <g
              style={{
                transformOrigin: "9px 22px",
                animation: legAnim,
                transform: gaiting ? undefined : `rotate(${-armAngle}deg)`,
              }}
            >
              <rect x="3.5" y="20" width="6" height="13" rx="3" fill={LIMB} />
            </g>
            {/* braço direito */}
            <g
              style={{
                transformOrigin: "35px 22px",
                animation: legAnimOffset,
                transform: gaiting ? undefined : `rotate(${armAngle}deg)`,
              }}
            >
              <rect x="34.5" y="20" width="6" height="13" rx="3" fill={LIMB} />
            </g>

            {/* antena */}
            <line x1="22" y1="3" x2="22" y2="-3" stroke={LIMB} strokeWidth="2" strokeLinecap="round" />
            <circle cx="22" cy="-4" r="2.4" fill={ACCENT} />

            {/* cabeça */}
            <rect x="8" y="3" width="28" height="19" rx="9" fill={BODY} />
            <rect x="11" y="5.5" width="10" height="5" rx="2.5" fill="#fff" opacity="0.35" />
            <rect x="12" y="10" width="20" height="8" rx="4" fill={VISOR} />
            <circle cx="18" cy="14" r="2.3" fill={EYE} />
            <circle cx="26" cy="14" r="2.3" fill={EYE} />
          </g>
        </svg>
      </div>
    </div>
  );
}
