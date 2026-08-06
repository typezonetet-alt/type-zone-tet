import { redirect } from "next/navigation";
import { TypingSession } from "@/components/typing/typing-session";
import { getServerUser } from "@/lib/session";
import { getServerExercise } from "@/lib/server-api";

export default async function ExercisePage({
  params,
}: {
  params: Promise<{ exerciseId: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const { exerciseId } = await params;
  const { status, exercise } = await getServerExercise(exerciseId);

  if (status === 401) {
    redirect("/login");
  }
  if (!exercise) {
    redirect("/aprender");
  }

  return (
    <main className="space-y-6 p-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-medium text-[var(--color-primary)]">Treinar</p>
        <h1 className="text-2xl font-semibold">{exercise.title}</h1>
      </div>

      <TypingSession exercise={exercise} />
    </main>
  );
}
