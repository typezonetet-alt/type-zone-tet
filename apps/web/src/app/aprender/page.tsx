import Link from "next/link";
import { redirect } from "next/navigation";
import type { ExerciseSummary } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getServerUser } from "@/lib/session";
import { getServerExercises, getServerWeakKeys, getServerWorlds } from "@/lib/server-api";

function ExerciseCard({ exercise }: { exercise: ExerciseSummary }) {
  const content = (
    <Card
      className={exercise.unlocked ? "transition-shadow hover:shadow-lg" : "opacity-60"}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <CardTitle className="text-base">{exercise.title}</CardTitle>
          <CardDescription>
            Meta de precisão: {Math.round(exercise.minAccuracy * 100)}%
            {exercise.targetWpm ? ` · ${exercise.targetWpm} WPM` : ""}
          </CardDescription>
        </div>
        {exercise.bestAccuracy !== null ? (
          <Badge variant={exercise.bestAccuracy >= exercise.minAccuracy ? "success" : "muted"}>
            {Math.round(exercise.bestAccuracy * 100)}%
          </Badge>
        ) : exercise.unlocked ? (
          <Badge variant="primary">Novo</Badge>
        ) : (
          <Badge variant="muted">Bloqueado</Badge>
        )}
      </div>
    </Card>
  );

  return exercise.unlocked ? (
    <Link href={`/aprender/${exercise.id}`}>{content}</Link>
  ) : (
    content
  );
}

export default async function AprenderPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const [worlds, exercises, weakKeys] = await Promise.all([
    getServerWorlds(),
    getServerExercises(),
    getServerWeakKeys(),
  ]);

  const exercisesByWorld = new Map<string, ExerciseSummary[]>();
  for (const exercise of exercises) {
    const list = exercisesByWorld.get(exercise.worldId) ?? [];
    list.push(exercise);
    exercisesByWorld.set(exercise.worldId, list);
  }

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">Aprender</p>
          <h1 className="text-2xl font-semibold">Trilha de exercícios</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/jogar" className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}>
            Jogar
          </Link>
          <Link href="/competir" className={cn(buttonVariants({ variant: "accent", size: "sm" }))}>
            Competir
          </Link>
          <Link href="/progresso" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
            Progresso
          </Link>
        </div>
      </div>

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

      <div className="space-y-10">
        {worlds.map((world) => {
          const worldExercises = exercisesByWorld.get(world.id) ?? [];
          return (
            <section key={world.id} className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold">{world.title}</h2>
                <p className="text-sm text-[var(--color-muted-foreground)]">{world.focus}</p>
              </div>

              {world.hasContent ? (
                <ol className="space-y-3">
                  {worldExercises.map((exercise) => (
                    <li key={exercise.id}>
                      <ExerciseCard exercise={exercise} />
                    </li>
                  ))}
                </ol>
              ) : (
                <Card className="opacity-60">
                  <CardDescription>Em breve</CardDescription>
                </Card>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
