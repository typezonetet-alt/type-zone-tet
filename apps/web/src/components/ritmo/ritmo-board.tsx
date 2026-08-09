import { GAME_IDENTITIES } from "../games/game-identity";
import { judgementForOffset, type Judgement } from "./ritmo-config";

const FLASH_MS = 420;
const SPAWN_PCT = 90;
const HIT_ZONE_PCT = 16;

const identity = GAME_IDENTITIES.ritmo;

const JUDGEMENT_LABEL: Record<Judgement, string> = {
  adiantado: "ADIANTADO",
  noRitmo: "NO RITMO!",
  apertado: "APERTADO",
};

const JUDGEMENT_COLOR: Record<Judgement, string> = {
  adiantado: "#fbbf24",
  noRitmo: "#34d399",
  apertado: "#fb923c",
};

export function RitmoBoard({
  word,
  typed,
  elapsedMs,
  wordAppearedAtMs,
  beatDeadlineMs,
  awaitingNextBeat,
  actionAt,
  missAt,
  lastJudgement,
  hitOffsets,
  reducedEffects,
}: {
  word: string;
  typed: number;
  elapsedMs: number;
  wordAppearedAtMs: number;
  beatDeadlineMs: number;
  awaitingNextBeat: boolean;
  actionAt: number | null;
  missAt: number | null;
  lastJudgement: Judgement | null;
  hitOffsets: number[];
  reducedEffects: boolean;
}) {
  const flashing = !reducedEffects && actionAt !== null && elapsedMs - actionAt < FLASH_MS;
  const missing = !reducedEffects && missAt !== null && elapsedMs - missAt < FLASH_MS;

  // A palavra desliza do nascimento (direita) até a zona de acerto (esquerda)
  // conforme a batida avança -- chega exatamente na zona no instante em que
  // o prazo estoura. Terminar de digitar não "teleporta" a palavra: ela
  // continua deslizando (agora travada) até a batida virar de verdade, o
  // que é a própria mecânica de "espere a próxima batida" ficando visível.
  const totalMs = Math.max(1, beatDeadlineMs - wordAppearedAtMs);
  const progress = Math.min(1, Math.max(0, (elapsedMs - wordAppearedAtMs) / totalMs));
  const wordLeftPct = SPAWN_PCT - progress * (SPAWN_PCT - HIT_ZONE_PCT);

  // Contador explícito de tempo: o deslizamento espacial dá a SENSAÇÃO de
  // urgência, mas não um número que dá pra calibrar ("quanto tempo eu
  // realmente tenho?"). Isso complementa a barra/posição com uma medida
  // direta, em segundos, do que resta até o prazo da batida.
  const remainingMs = Math.max(0, beatDeadlineMs - elapsedMs);
  const remainingFrac = 1 - progress;
  const remainingLabel = (remainingMs / 1000).toFixed(1);

  const recentOffsets = hitOffsets.slice(-10);

  return (
    <div
      className="space-y-3 overflow-hidden rounded-[var(--radius-card)] p-6 shadow-[var(--shadow-card)]"
      style={{ background: `linear-gradient(180deg, ${identity.from} 0%, ${identity.to} 100%)` }}
    >
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full transition-[width] duration-75 ease-linear"
            style={{
              width: `${remainingFrac * 100}%`,
              backgroundColor: missing ? "var(--color-error)" : identity.glow,
            }}
          />
        </div>
        <span className="w-12 shrink-0 text-right font-mono text-sm tabular-nums text-white/70">
          {remainingLabel}s
        </span>
      </div>

      <div className="relative h-28 overflow-hidden rounded-2xl bg-black/25">
        {/* Trilho da batida. */}
        <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-white/10" />

        {/* Zona de acerto: pulsa uma vez por batida (a key força reiniciar a
            animação a cada wordAppearedAtMs novo). */}
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${HIT_ZONE_PCT}%` }}
        >
          <div
            key={wordAppearedAtMs}
            className={
              "h-16 w-1.5 rounded-full " +
              (missing ? "" : "motion-safe:animate-[ritmo-beat-pulse_500ms_ease-out]")
            }
            style={{ backgroundColor: missing ? "var(--color-error)" : identity.glow }}
          />
        </div>

        {/* A palavra. */}
        <div
          className={
            "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl border-2 px-4 py-2 font-mono text-lg backdrop-blur-sm transition-[left] duration-75 ease-linear " +
            (missing
              ? "border-[var(--color-error)] bg-[var(--color-error)]/15 motion-safe:animate-[ritmo-miss-drift_420ms_ease-in_forwards]"
              : awaitingNextBeat
                ? "border-white/40 bg-black/50"
                : "border-white/20 bg-black/40")
          }
          style={{ left: `${wordLeftPct}%` }}
        >
          <span style={{ color: identity.glow }}>{word.slice(0, typed)}</span>
          <span className="text-white/85">{word.slice(typed)}</span>
        </div>

        {/* Selo do julgamento, na própria zona de acerto. */}
        {flashing && lastJudgement ? (
          <div
            key={actionAt}
            className="pointer-events-none absolute top-2 -translate-x-1/2 text-sm font-black tracking-wide motion-safe:animate-[ritmo-judgement-pop_650ms_ease-out_forwards]"
            style={{ left: `${HIT_ZONE_PCT}%`, color: JUDGEMENT_COLOR[lastJudgement] }}
          >
            {JUDGEMENT_LABEL[lastJudgement]}
          </div>
        ) : null}
      </div>

      {/* Histórico de acertos: onde dentro de cada batida a palavra terminou
          -- o mesmo dado por trás da "consistência", mas visível JÁ, não só
          num número depois do fim de jogo. Aglomerado = regular; espalhado =
          "rajadas", exatamente o que o briefing pede pra corrigir. */}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/40">Adiantado</span>
        <div className="relative h-2 flex-1 rounded-full bg-white/10">
          <div
            className="absolute inset-y-0 rounded-full bg-white/15"
            style={{ left: "28%", right: "28%" }}
          />
          {recentOffsets.map((offset, i) => (
            <span
              key={i}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: `${offset * 100}%`,
                backgroundColor: JUDGEMENT_COLOR[judgementForOffset(offset)],
                opacity: 0.4 + (0.6 * (i + 1)) / recentOffsets.length,
              }}
            />
          ))}
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-wide text-white/40">Apertado</span>
      </div>
    </div>
  );
}
