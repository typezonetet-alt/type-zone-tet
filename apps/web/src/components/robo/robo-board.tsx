import { useEffect, useRef, useState } from "react";
import { GAME_IDENTITIES } from "../games/game-identity";
import { RoboCharacter } from "./robo-character";
import { RoboObstacle } from "./robo-obstacle";
import { JUMP_MS, ROBOT_X } from "./use-robo-game";
import {
  OBSTACLE_LABEL,
  STAGE_LABELS,
  STAGE_SUCCESSES_REQUIRED,
  handOf,
  type ObstacleKind,
} from "./robo-word-bank";

const STUMBLE_MS = 420;
const STAGE_BANNER_MS = 1600;

const identity = GAME_IDENTITIES.robo;

export function RoboBoard({
  challenge,
  stage,
  stageSuccesses,
  obstacleKind,
  elapsedMs,
  obstacleX,
  jumpStartedAt,
  cleared,
  missAt,
  reducedEffects,
}: {
  challenge: string;
  stage: number;
  stageSuccesses: number;
  obstacleKind: ObstacleKind;
  elapsedMs: number;
  obstacleX: number | null;
  jumpStartedAt: number | null;
  cleared: boolean;
  missAt: number | null;
  reducedEffects: boolean;
}) {
  const stumbling = !reducedEffects && missAt !== null && elapsedMs - missAt < STUMBLE_MS;
  const jumpProgress =
    jumpStartedAt !== null ? Math.min(1, (elapsedMs - jumpStartedAt) / JUMP_MS) : null;

  const ducking = obstacleKind === "door";
  const stageBanner = useStageBanner(stage);
  const hand = challenge ? handOf(challenge) : null;

  return (
    <div className="space-y-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] p-6 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between text-xs text-[var(--color-muted-foreground)]">
        <span className="font-semibold uppercase tracking-wide">
          Fase {stage} · {STAGE_LABELS[stage - 1]}
        </span>
        <div
          className="flex items-center gap-1"
          aria-label={`${stageSuccesses}/${STAGE_SUCCESSES_REQUIRED} nesta fase`}
        >
          {Array.from({ length: STAGE_SUCCESSES_REQUIRED }, (_, i) => (
            <span
              key={i}
              className="h-1.5 w-4 rounded-full"
              style={{
                backgroundColor: i < stageSuccesses ? "var(--color-accent)" : "var(--color-muted)",
              }}
            />
          ))}
        </div>
      </div>

      <div
        className="relative h-56 overflow-hidden rounded-[var(--radius-card)]"
        style={{ background: `linear-gradient(180deg, ${identity.from} 0%, ${identity.to} 78%)` }}
      >
        {/* Paralaxe de fundo: colinas bem lentas, só pra dar profundidade. */}
        {!reducedEffects ? (
          <div
            className="absolute inset-x-0 top-6 h-10 opacity-25 motion-safe:animate-[robo-parallax-drift_9s_linear_infinite]"
            style={{
              backgroundImage: `radial-gradient(circle, ${identity.glow} 0%, transparent 65%)`,
              backgroundSize: "60px 40px",
              backgroundRepeat: "repeat-x",
              width: "160%",
            }}
            aria-hidden="true"
          />
        ) : null}

        {/* Chão: faixa sólida com tracejado rolando -- a pista passando. */}
        <div
          className="absolute inset-x-0 bottom-8 h-2 opacity-70"
          style={{ backgroundColor: identity.edge }}
          aria-hidden="true"
        />
        {!reducedEffects ? (
          <div
            className="absolute inset-x-0 bottom-[34px] h-1 opacity-80 motion-safe:animate-[robo-ground-scroll_0.7s_linear_infinite]"
            style={{
              backgroundImage: `repeating-linear-gradient(90deg, ${identity.glow} 0 16px, transparent 16px 32px)`,
            }}
            aria-hidden="true"
          />
        ) : null}

        {/* A TECLA fica PARADA no alto, sempre no mesmo lugar. Quando ela
            viajava junto com o obstáculo, ficava ilegível na velocidade das
            fases altas -- o olho tem que achar a letra num ponto fixo e
            acompanhar o obstáculo pela visão periférica, não perseguir as
            duas coisas ao mesmo tempo. */}
        <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
          <div
            className={
              "flex h-14 w-14 items-center justify-center rounded-2xl border-2 font-mono text-3xl font-black uppercase transition-opacity duration-150 " +
              (cleared || obstacleX === null ? "opacity-30" : "")
            }
            style={{
              borderColor: identity.glow,
              backgroundColor: "rgba(0,0,0,.55)",
              color: identity.glow,
              boxShadow: cleared || obstacleX === null ? "none" : `0 0 18px ${identity.glow}55`,
            }}
          >
            {challenge}
          </div>
        </div>

        {/* Obstáculo vindo pela direita -- sozinho, sem texto grudado nele. */}
        {obstacleX !== null ? (
          <div
            className="absolute bottom-8"
            style={{
              left: `${obstacleX}%`,
              transform: "translateX(-50%)",
              opacity: cleared ? 0.25 : 1,
            }}
            title={OBSTACLE_LABEL[obstacleKind]}
          >
            <RoboObstacle kind={obstacleKind} />
          </div>
        ) : null}

        {stumbling ? (
          <div
            className="absolute bottom-9 h-14 w-14 -translate-x-1/2 rounded-full border-2 motion-safe:animate-[robo-impact-burst_420ms_ease-out]"
            style={{ left: `${ROBOT_X}%`, borderColor: "#fecaca" }}
            aria-hidden="true"
          />
        ) : null}

        {/* O robô corre PARADO na mesma posição -- é o mundo que passa. */}
        <div
          className="absolute bottom-8 z-10 -translate-x-1/2"
          style={{ left: `${ROBOT_X}%` }}
        >
          <RoboCharacter
            jumpProgress={jumpProgress}
            stumbling={stumbling}
            ducking={ducking}
            reducedEffects={reducedEffects}
          />
        </div>

        {stageBanner ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-black/60 px-5 py-2 text-lg font-black uppercase tracking-wide text-white motion-safe:animate-[orbital-levelup_1.6s_ease-out_forwards]">
              Fase {stage}
            </span>
          </div>
        ) : null}
      </div>

      <p className="text-center text-xs text-[var(--color-muted-foreground)]">
        {challenge ? (
          <>
            Aperte <strong className="font-mono uppercase">{challenge}</strong> quando o obstáculo
            chegar · mão {hand === "left" ? "esquerda" : "direita"}
          </>
        ) : (
          "Prepare-se..."
        )}
      </p>
    </div>
  );
}

// Banner "Fase N" ao avançar de fase -- puramente visual (não existe estado
// disso no reducer, então detectamos a mudança de `stage` aqui mesmo, do
// jeito mais simples possível pra um componente presentacional).
function useStageBanner(stage: number): boolean {
  const [visible, setVisible] = useState(false);
  const previousStage = useRef(stage);

  useEffect(() => {
    if (stage === previousStage.current) return;
    previousStage.current = stage;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), STAGE_BANNER_MS);
    return () => clearTimeout(timer);
  }, [stage]);

  return visible;
}
