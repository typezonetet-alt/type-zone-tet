import Link from "next/link";
import { meetsMasteryBar, type ExerciseSummary, type WorldSummary } from "@tt-digita/shared";
import { TtMascot } from "@/components/mascot/tt-mascot";

const MASTERY_LABEL: Record<ExerciseSummary["mastery"], string> = {
  none: "",
  bronze: "Bronze",
  prata: "Prata",
  ouro: "Ouro",
  diamante: "Diamante",
};

const MASTERY_MEDAL: Record<ExerciseSummary["mastery"], string> = {
  none: "",
  bronze: "🥉",
  prata: "🥈",
  ouro: "🥇",
  diamante: "💎",
};

const NODE_SIZE = 64;
const GAP_Y = 100;
const AMPLITUDE = 78;
const TRACK_WIDTH = 320;

function xOffset(index: number): number {
  return Math.round(Math.sin((index * Math.PI) / 4) * AMPLITUDE);
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" fill="white" fillOpacity="0.9" />
      <path
        d="M8 11V8a4 4 0 0 1 8 0v3"
        stroke="white"
        strokeWidth="2.2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 13l4 4L19 7"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LessonNode({
  exercise,
  color,
  showStartBubble,
  unlockHint,
}: {
  exercise: ExerciseSummary;
  color: string;
  showStartBubble: boolean;
  /** O que falta pra desbloquear ESTE exercício -- ver aprender/page.tsx. */
  unlockHint: { minAccuracy: number; bestAccuracy: number | null } | null;
}) {
  const mastered = meetsMasteryBar(exercise.mastery);
  const locked = !exercise.unlocked;
  const current = !locked && !mastered;
  const inProgress = current && exercise.mastery === "bronze";

  const lockedTitle = unlockHint
    ? `Bloqueado — alcance ${Math.round(unlockHint.minAccuracy * 100)}% de precisão no exercício anterior pra desbloquear` +
      (unlockHint.bestAccuracy !== null
        ? ` (seu melhor até agora: ${Math.round(unlockHint.bestAccuracy * 100)}%)`
        : " (você ainda não tentou o exercício anterior)")
    : "Bloqueado";

  const circle = (
    <div
      className={
        "flex h-16 w-16 items-center justify-center rounded-full border-b-4 shadow-md transition-transform " +
        (current ? "animate-[node-pulse_2s_ease-in-out_infinite]" : "") +
        (locked ? "" : " hover:-translate-y-0.5")
      }
      style={{
        backgroundColor: locked ? "var(--color-muted-foreground)" : color,
        borderBottomColor: locked ? "transparent" : "rgba(0,0,0,0.18)",
        opacity: locked ? 0.45 : 1,
      }}
      title={locked ? lockedTitle : mastered ? `${exercise.title} — ${MASTERY_LABEL[exercise.mastery]}` : exercise.title}
    >
      {mastered ? (
        <span className="text-2xl" aria-hidden="true">
          {MASTERY_MEDAL[exercise.mastery]}
        </span>
      ) : locked ? (
        <LockIcon />
      ) : (
        <span className="text-lg font-bold text-white">{exercise.order}</span>
      )}
    </div>
  );

  return (
    <div className="relative flex flex-col items-center">
      {showStartBubble ? (
        <div className="absolute -top-11 whitespace-nowrap rounded-xl bg-[var(--color-card)] px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--foreground)] shadow-md">
          Começar
          <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 -translate-y-1 rotate-45 bg-[var(--color-card)]" />
        </div>
      ) : null}
      {locked ? circle : <Link href={`/aprender/${exercise.id}`}>{circle}</Link>}
      {inProgress ? (
        <span className="mt-1 whitespace-nowrap text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          continue praticando
        </span>
      ) : null}
      {locked && unlockHint ? (
        <span className="mt-1 max-w-24 whitespace-normal text-center text-[10px] leading-tight text-[var(--color-muted-foreground)]">
          precisa de {Math.round(unlockHint.minAccuracy * 100)}% no anterior
        </span>
      ) : null}
    </div>
  );
}

export function WorldPath({
  world,
  exercises,
  color,
  hasCurrentBubble,
  unlockHintById,
}: {
  world: WorldSummary;
  exercises: ExerciseSummary[];
  color: string;
  hasCurrentBubble: boolean;
  unlockHintById: Map<string, { minAccuracy: number; bestAccuracy: number | null } | null>;
}) {
  const points = exercises.map((_, i) => ({
    x: TRACK_WIDTH / 2 + xOffset(i),
    y: i * GAP_Y + NODE_SIZE / 2,
  }));
  const trackHeight = exercises.length > 0 ? (exercises.length - 1) * GAP_Y + NODE_SIZE + 16 : 0;
  const firstCurrentIndex = exercises.findIndex((e) => e.unlocked && !meetsMasteryBar(e.mastery));

  return (
    <section className="space-y-6">
      <div
        className="flex items-center gap-4 rounded-[var(--radius-card)] p-5 text-white shadow-[var(--shadow-card)]"
        style={{ backgroundColor: color }}
      >
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider opacity-80">
            Mundo {world.order}
          </p>
          <h2 className="text-xl font-bold">{world.title}</h2>
          <p className="text-sm opacity-90">{world.focus}</p>
        </div>
        {!world.hasContent ? (
          <span className="rounded-full bg-black/15 px-3 py-1 text-xs font-semibold">
            Em breve
          </span>
        ) : null}
      </div>

      {world.hasContent ? (
        <div
          className="relative mx-auto"
          style={{ width: TRACK_WIDTH, height: trackHeight }}
        >
          <svg
            className="pointer-events-none absolute inset-0"
            width={TRACK_WIDTH}
            height={trackHeight}
          >
            <polyline
              points={points.map((p) => `${p.x},${p.y}`).join(" ")}
              fill="none"
              stroke={color}
              strokeOpacity={0.3}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray="2 16"
            />
          </svg>
          {exercises.map((exercise, i) => (
            <div
              key={exercise.id}
              className="absolute"
              style={{
                left: points[i].x,
                top: points[i].y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <LessonNode
                exercise={exercise}
                color={color}
                showStartBubble={hasCurrentBubble && i === firstCurrentIndex}
                unlockHint={unlockHintById.get(exercise.id) ?? null}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)]">
          <TtMascot size={40} mood="sleepy" />
          Conteúdo chegando em breve.
        </div>
      )}
    </section>
  );
}
