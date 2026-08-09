import Link from "next/link";
import { redirect } from "next/navigation";
import { Role, meetsMasteryBar, type ExerciseSummary } from "@tt-digita/shared";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { brandColorFor } from "@/lib/palette";
import { getServerUser } from "@/lib/session";
import {
  getServerAdaptiveSession,
  getServerExercises,
  getServerProfile,
  getServerSeason,
  getServerWeakKeys,
  getServerWorlds,
} from "@/lib/server-api";
import { TtMascot } from "@/components/mascot/tt-mascot";
import { WorldPath } from "./world-path";
import { AdaptiveSessionCard } from "./adaptive-session-card";

export default async function AprenderPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }

  const [worlds, exercises, weakKeys, profile, season, adaptiveSession] = await Promise.all([
    getServerWorlds(),
    getServerExercises(),
    getServerWeakKeys(),
    getServerProfile(),
    getServerSeason(),
    getServerAdaptiveSession(),
  ]);

  const exercisesByWorld = new Map<string, ExerciseSummary[]>();
  for (const exercise of exercises) {
    const list = exercisesByWorld.get(exercise.worldId) ?? [];
    list.push(exercise);
    exercisesByWorld.set(exercise.worldId, list);
  }

  // Pra explicar (não só mostrar) um nó bloqueado: o limiar que trava o
  // exercício N é o `minAccuracy` do exercício N-1 na ordem GLOBAL da
  // trilha (a cascata de desbloqueio atravessa fronteira de mundo -- ver
  // exercises.service.ts). `exercises` já vem nessa ordem exata da API.
  const unlockHintById = new Map<
    string,
    { minAccuracy: number; bestAccuracy: number | null } | null
  >();
  exercises.forEach((exercise, i) => {
    const previous = i > 0 ? exercises[i - 1] : null;
    unlockHintById.set(
      exercise.id,
      previous ? { minAccuracy: previous.minAccuracy, bestAccuracy: previous.bestAccuracy } : null,
    );
  });

  function isCurrentLesson(exercise: ExerciseSummary): boolean {
    return exercise.unlocked && !meetsMasteryBar(exercise.mastery);
  }

  // So o primeiro "no atual" da trilha inteira ganha o balao "Começar" --
  // evita varios baloes flutuando se, por algum motivo, mais de um mundo
  // tivesse uma licao destravada e nao concluida ao mesmo tempo.
  const firstCurrentWorldId = worlds.find((world) =>
    (exercisesByWorld.get(world.id) ?? []).some(isCurrentLesson),
  )?.id;

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <TtMascot size={44} />
          <div>
            <p className="text-sm font-medium text-[var(--color-primary)]">Aprender</p>
            <h1 className="text-2xl font-semibold">Trilha de exercícios</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jogar" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Jogar
          </Link>
          <Link href="/competir" className={cn(buttonVariants({ variant: "accent", size: "sm" }))}>
            Competir
          </Link>
        </div>
      </div>

      {profile ? (
        <Link href="/progresso" className="block">
          <Card className="flex flex-wrap items-center justify-between gap-3 transition-shadow hover:shadow-lg">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={profile.currentStreak > 0 ? "success" : "muted"}>
                🔥 {profile.currentStreak} {profile.currentStreak === 1 ? "dia" : "dias"}
              </Badge>
              <Badge variant="accent">{profile.coins} moedas</Badge>
              {season ? <Badge variant="primary">{season.league}</Badge> : null}
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--color-muted-foreground)]">Nível {profile.level}</p>
              <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-[var(--color-muted)] sm:w-28">
                <div
                  className="h-full rounded-full bg-[var(--color-primary)]"
                  style={{
                    width: `${Math.min(100, Math.round((profile.xpIntoLevel / Math.max(1, profile.xpForNextLevel)) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </Card>
        </Link>
      ) : null}

      <AdaptiveSessionCard items={adaptiveSession} />

      {weakKeys.length > 0 ? (
        <Card className="space-y-3">
          <CardTitle className="text-base">Teclas para melhorar</CardTitle>
          <div className="flex flex-wrap gap-2">
            {weakKeys.map((key) => (
              <Badge key={key.char} variant="error">
                {key.char === " " ? "espaço" : key.char} · {Math.round(key.errorRate * 100)}%
                de erro
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      <div className="space-y-12">
        {worlds.map((world, index) => (
          <WorldPath
            key={world.id}
            world={world}
            exercises={exercisesByWorld.get(world.id) ?? []}
            color={brandColorFor(index)}
            hasCurrentBubble={world.id === firstCurrentWorldId}
            unlockHintById={unlockHintById}
          />
        ))}
      </div>
    </main>
  );
}
