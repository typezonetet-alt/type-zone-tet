import type { CSSProperties } from "react";
import { juiceColorFor } from "./salada-config";
import { LEVEL_UP_BANNER_MS, type SaladaEffect, type Tossed } from "./use-salada-game";

// Ângulos (em graus) dos respingos de suco ao redor do ponto de corte --
// espaçados de forma irregular de propósito, pra não parecer um floco de
// neve perfeitamente simétrico.
const JUICE_ANGLES = [15, 70, 125, 175, 235, 290, 340];
const JUICE_DISTANCE = 24;

function SliceEffect({ effect }: { effect: SaladaEffect }) {
  const juice = juiceColorFor(effect.emoji ?? "");
  // Ângulo pseudo-aleatório derivado do id do efeito -- não precisa de estado
  // novo no reducer, só precisa parecer que a lâmina passou de um jeito
  // diferente a cada corte.
  const angle = ((effect.id * 47) % 140) - 70;
  return (
    <div
      className="pointer-events-none absolute"
      style={{ left: `${effect.x}%`, top: `${effect.y}%`, transform: "translate(-50%, -50%)" }}
    >
      {/* O gesto do corte: um traço de lâmina cruzando o ponto de impacto,
          rápido e brilhante, antes das metades se separarem. */}
      <span
        className="absolute left-0 top-0"
        style={{ transform: `translate(-50%, -50%) rotate(${angle}deg)` }}
        aria-hidden="true"
      >
        <span className="block h-[3px] w-14 origin-center rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,.85)] motion-safe:animate-[salada-slash-line_260ms_ease-out_forwards]" />
      </span>

      {/* A fruta cortada ao meio: duas metades do mesmo emoji, cada uma só
          mostrando sua própria metade (clip-path), voando em direções opostas. */}
      <span
        className="absolute text-3xl motion-safe:animate-[salada-half-left_550ms_ease-out_forwards]"
        style={{ clipPath: "inset(0 50% 0 0)" }}
        aria-hidden="true"
      >
        {effect.emoji}
      </span>
      <span
        className="absolute text-3xl motion-safe:animate-[salada-half-right_550ms_ease-out_forwards]"
        style={{ clipPath: "inset(0 0 0 50%)" }}
        aria-hidden="true"
      >
        {effect.emoji}
      </span>

      {/* Respingo de suco, na cor da própria fruta. */}
      {JUICE_ANGLES.map((angle, i) => {
        const rad = (angle * Math.PI) / 180;
        const dx = Math.cos(rad) * JUICE_DISTANCE;
        const dy = Math.sin(rad) * JUICE_DISTANCE;
        const style = {
          backgroundColor: juice,
          animationDelay: `${i * 10}ms`,
          ["--dx"]: `${dx}px`,
          ["--dy"]: `${dy}px`,
        } as CSSProperties;
        return (
          <span
            key={angle}
            className="absolute left-0 top-0 h-1.5 w-1.5 rounded-full motion-safe:animate-[salada-juice-splat_550ms_ease-out_forwards]"
            style={style}
          />
        );
      })}
    </div>
  );
}

export function SaladaBoard({
  tossed,
  focusedId,
  effects,
  level,
  levelUpAtMs,
  elapsedMs,
  reducedEffects,
}: {
  tossed: Tossed[];
  focusedId: number | null;
  effects: SaladaEffect[];
  level: number;
  levelUpAtMs: number | null;
  elapsedMs: number;
  reducedEffects: boolean;
}) {
  const showingLevelUp =
    levelUpAtMs !== null && elapsedMs - levelUpAtMs < LEVEL_UP_BANNER_MS;
  const sliceEffects = effects.filter((e) => e.kind === "slice");
  const ringEffects = effects.filter((e) => e.kind !== "slice");

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-gradient-to-b from-[#3b1f57] via-[#28143d] to-[#160b26] shadow-[var(--shadow-card)]">
      {/* Tábua de corte no rodapé: marca a linha onde a fruta se perde. */}
      <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-black/50 to-transparent" />

      {!reducedEffects ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {ringEffects.map((effect) => {
            const color = effect.kind === "boom" ? "var(--color-error)" : "var(--color-accent)";
            return (
              <circle
                key={effect.id}
                cx={effect.x}
                cy={effect.y}
                r={2}
                fill="none"
                stroke={color}
                strokeWidth={1.2}
                className="motion-safe:animate-[orbital-burst-expand_420ms_ease-out_forwards]"
              />
            );
          })}
        </svg>
      ) : null}

      {!reducedEffects
        ? sliceEffects.map((effect) => <SliceEffect key={effect.id} effect={effect} />)
        : null}

      {tossed.map((item) => {
        const isFocused = item.id === focusedId;
        return (
          <div
            key={item.id}
            className="absolute flex flex-col items-center"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <span
              className="text-3xl drop-shadow-lg"
              style={{
                display: "inline-block",
                transform: reducedEffects ? undefined : `rotate(${item.spin}deg)`,
              }}
              aria-hidden="true"
            >
              {item.emoji}
            </span>
            <span
              className={
                "mt-0.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-sm backdrop-blur-sm " +
                (item.isBomb
                  ? "border-red-400 bg-red-950/90 shadow-[0_0_12px_rgba(248,113,113,.8)]"
                  : isFocused
                    ? "border-[var(--color-accent)] bg-black/70 shadow-[0_0_10px_var(--color-accent)]"
                    : "border-white/25 bg-black/55")
              }
            >
              <span className={item.isBomb ? "text-red-300" : "text-[var(--color-success)]"}>
                {item.text.slice(0, item.typed)}
              </span>
              <span className={item.isBomb ? "text-red-200" : isFocused ? "text-white" : "text-white/75"}>
                {item.text.slice(item.typed)}
              </span>
            </span>
          </div>
        );
      })}

      {showingLevelUp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-full bg-black/60 px-5 py-2 text-lg font-black uppercase tracking-wide text-white motion-safe:animate-[orbital-levelup_1.8s_ease-out_forwards]">
            Nível {level}
          </span>
        </div>
      ) : null}
    </div>
  );
}
