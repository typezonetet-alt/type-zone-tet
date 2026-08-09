import type { FallingWord, GameEffect } from "./use-chuva-game";

export function ChuvaBoard({
  words,
  focusedWordId,
  effects,
  reducedEffects,
}: {
  words: FallingWord[];
  focusedWordId: number | null;
  effects: GameEffect[];
  reducedEffects: boolean;
}) {
  return (
    <div className="relative h-[420px] w-full overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-gradient-to-b from-slate-200 to-slate-50 shadow-[var(--shadow-card)] dark:from-slate-800 dark:to-slate-900">
      {!reducedEffects ? (
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(100deg, transparent, transparent 38px, var(--color-secondary) 39px, transparent 40px)",
          }}
        />
      ) : null}

      {!reducedEffects ? (
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {effects.map((effect) => {
            if (effect.kind === "drop") {
              return (
                <circle
                  key={effect.id}
                  cx={effect.x}
                  cy={effect.y}
                  r={0.8}
                  fill="var(--color-secondary)"
                  className="motion-safe:animate-[orbital-shot-fade_220ms_ease-out_forwards]"
                />
              );
            }
            const color = effect.kind === "splash" ? "var(--color-success)" : "var(--color-error)";
            return (
              <circle
                key={effect.id}
                cx={effect.x}
                cy={effect.kind === "splash" ? effect.y : 97}
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
                "flex items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 font-mono text-base backdrop-blur-sm " +
                (reducedEffects ? "" : "motion-safe:animate-[orbital-spawn_180ms_ease-out] ") +
                (isFocused
                  ? "border-[var(--color-secondary)] bg-white shadow-[0_0_10px_var(--color-secondary)] dark:bg-slate-800"
                  : "border-slate-300 bg-white/70 dark:border-slate-600 dark:bg-slate-800/70")
              }
            >
              <span aria-hidden="true">💧</span>
              <span className="text-[var(--color-success)]">{word.text.slice(0, word.typed)}</span>
              <span className={isFocused ? "text-[var(--foreground)]" : "text-[var(--color-muted-foreground)]"}>
                {word.text.slice(word.typed)}
              </span>
            </div>
          </div>
        );
      })}

      <div className="absolute inset-x-0 bottom-0 h-3 bg-gradient-to-t from-[var(--color-secondary)]/40 to-transparent" />
    </div>
  );
}
