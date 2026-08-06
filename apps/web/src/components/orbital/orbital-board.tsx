import { LEVEL_UP_BANNER_MS, type FallingWord, type GameEffect } from "./use-orbital-game";
import { OrbitalBackground } from "./orbital-background";
import { OrbitalShip } from "./orbital-ship";

const SHIP_X = 50;
const SHIP_Y = 95;

export function OrbitalBoard({
  words,
  focusedWordId,
  effects,
  level,
  levelUpAtMs,
  elapsedMs,
  reducedEffects,
}: {
  words: FallingWord[];
  focusedWordId: number | null;
  effects: GameEffect[];
  level: number;
  levelUpAtMs: number | null;
  elapsedMs: number;
  reducedEffects: boolean;
}) {
  const firing = effects.some((e) => e.kind === "shot");
  const showLevelUp =
    levelUpAtMs !== null && elapsedMs - levelUpAtMs < LEVEL_UP_BANNER_MS;

  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
      <OrbitalBackground reducedEffects={reducedEffects} />

      {!reducedEffects ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {effects.map((effect) => {
            if (effect.kind === "shot") {
              return (
                <line
                  key={effect.id}
                  x1={SHIP_X}
                  y1={SHIP_Y}
                  x2={effect.x}
                  y2={effect.y}
                  stroke="var(--color-accent)"
                  strokeWidth={0.6}
                  strokeLinecap="round"
                  className="motion-safe:animate-[orbital-shot-fade_220ms_ease-out_forwards]"
                />
              );
            }
            const color = effect.kind === "burst" ? "var(--color-success)" : "var(--color-error)";
            return (
              <circle
                key={effect.id}
                cx={effect.x}
                cy={effect.kind === "burst" ? effect.y : 97}
                r={1}
                fill="none"
                stroke={color}
                strokeWidth={0.8}
                className="motion-safe:animate-[orbital-burst-expand_380ms_ease-out_forwards]"
              />
            );
          })}
        </svg>
      ) : null}

      {words.map((word) => {
        const isFocused = word.id === focusedWordId;
        return (
          // O par (left: x%, translateX(-x%)) mantem a palavra inteira sempre
          // dentro do tabuleiro, sem precisar saber a largura dela: em x=0 ela
          // encosta na esquerda, em x=100 na direita, em x=50 fica centrada.
          // Simplesmente sortear o centro deixava palavras longas metade pra
          // fora quando o sorteio caia perto das bordas.
          <div
            key={word.id}
            className="absolute"
            style={{
              left: `${word.x}%`,
              top: `${word.progress * 92}%`,
              transform: `translateX(-${word.x}%)`,
            }}
          >
            <div
              className={
                "whitespace-nowrap rounded-lg border px-2.5 py-1 font-mono text-lg backdrop-blur-sm " +
                (reducedEffects ? "" : "motion-safe:animate-[orbital-spawn_180ms_ease-out] ") +
                (isFocused
                  ? "border-[var(--color-accent)] bg-black/70 shadow-[0_0_14px_var(--color-accent)]"
                  : "border-white/15 bg-black/45")
              }
            >
              <span className="text-[var(--color-success)]">{word.text.slice(0, word.typed)}</span>
              <span className={isFocused ? "text-white" : "text-white/70"}>
                {word.text.slice(word.typed)}
              </span>
            </div>
          </div>
        );
      })}

      {showLevelUp ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={
              "rounded-2xl border-2 border-[var(--color-accent)] bg-black/75 px-10 py-6 text-center backdrop-blur-sm " +
              (reducedEffects ? "" : "motion-safe:animate-[orbital-levelup_2200ms_ease-out_forwards]")
            }
          >
            <p className="text-sm font-medium uppercase tracking-[0.3em] text-[var(--color-accent)]">
              Nível completo
            </p>
            <p className="mt-1 text-5xl font-bold text-white">Nível {level}</p>
            <p className="mt-1 text-sm text-white/70">As palavras vêm mais rápido agora</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-2 -translate-x-1/2" style={{ left: `${SHIP_X}%` }}>
        <OrbitalShip firing={firing} />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--color-secondary)]/70 to-transparent" />
    </div>
  );
}
