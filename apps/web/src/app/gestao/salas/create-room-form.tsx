"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { RoomExerciseOption } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { ApiError, createRoom, listRoomExercises } from "@/lib/api";

export function CreateRoomForm() {
  const router = useRouter();
  const [exercises, setExercises] = useState<RoomExerciseOption[]>([]);
  const [exerciseId, setExerciseId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRoomExercises()
      .then((list) => {
        setExercises(list);
        if (list.length > 0) setExerciseId(list[0].id);
      })
      .catch(() => setError("Não foi possível carregar os exercícios."));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!exerciseId) return;
    setLoading(true);
    setError(null);
    try {
      const room = await createRoom({ exerciseId });
      router.push(`/gestao/salas/${room.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a sala.");
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="exercise">
            Exercício
          </label>
          <select
            id="exercise"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
            disabled={exercises.length === 0}
            className="h-11 w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
          >
            {exercises.map((exercise) => (
              <option key={exercise.id} value={exercise.id}>
                {exercise.worldTitle} · {exercise.title}
              </option>
            ))}
          </select>
        </div>

        {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}

        <Button type="submit" disabled={loading || !exerciseId}>
          {loading ? "Criando..." : "Criar sala"}
        </Button>
      </form>

      {exercises.length === 0 && !error ? (
        <CardDescription>Carregando exercícios...</CardDescription>
      ) : null}
    </Card>
  );
}
