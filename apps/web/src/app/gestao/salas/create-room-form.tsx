"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { LiveRoomActivityType, type RoomGameOption, type RoomWorldOption } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Card, CardDescription } from "@/components/ui/card";
import { ApiError, createRoom, listRoomGames, listRoomWorlds } from "@/lib/api";
import { GAME_IDENTITIES, ARCADE_ORDER, slugForGameType } from "@/components/games/game-identity";
import { cn } from "@/lib/cn";

type Tab = "world" | "game";

export function CreateRoomForm() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("world");
  const [worlds, setWorlds] = useState<RoomWorldOption[]>([]);
  const [games, setGames] = useState<RoomGameOption[]>([]);
  const [worldId, setWorldId] = useState("");
  const [gameType, setGameType] = useState<RoomGameOption["gameType"] | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listRoomWorlds()
      .then((list) => {
        setWorlds(list);
        if (list.length > 0) setWorldId(list[0].id);
      })
      .catch(() => setError("Não foi possível carregar os mundos."));
    listRoomGames()
      .then((list) => {
        setGames(list);
        if (list.length > 0) setGameType(list[0].gameType);
      })
      .catch(() => setError("Não foi possível carregar os jogos."));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const room =
        tab === "world"
          ? await createRoom({ activityType: LiveRoomActivityType.WORLD, worldId })
          : await createRoom({
              activityType: LiveRoomActivityType.GAME,
              gameType: gameType || undefined,
            });
      router.push(`/gestao/salas/${room.code}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar a sala.");
      setLoading(false);
    }
  }

  const canSubmit = tab === "world" ? Boolean(worldId) : Boolean(gameType);

  return (
    <Card className="space-y-4">
      <div className="flex gap-2 rounded-[var(--radius-card)] bg-[var(--color-muted)] p-1">
        <button
          type="button"
          onClick={() => setTab("world")}
          className={cn(
            "flex-1 rounded-[calc(var(--radius-card)-4px)] py-2 text-sm font-semibold transition-colors",
            tab === "world"
              ? "bg-[var(--color-card)] shadow-sm"
              : "text-[var(--color-muted-foreground)]",
          )}
        >
          Mundo
        </button>
        <button
          type="button"
          onClick={() => setTab("game")}
          className={cn(
            "flex-1 rounded-[calc(var(--radius-card)-4px)] py-2 text-sm font-semibold transition-colors",
            tab === "game"
              ? "bg-[var(--color-card)] shadow-sm"
              : "text-[var(--color-muted-foreground)]",
          )}
        >
          Jogo
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {tab === "world" ? (
          <div className="space-y-1.5">
            <label className="text-sm font-medium" htmlFor="world">
              Mundo — a sala roda todos os exercícios dele, em ordem
            </label>
            <select
              id="world"
              value={worldId}
              onChange={(e) => setWorldId(e.target.value)}
              disabled={worlds.length === 0}
              className="h-11 w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            >
              {worlds.map((world) => (
                <option key={world.id} value={world.id}>
                  {world.title} · {world.exerciseCount}{" "}
                  {world.exerciseCount === 1 ? "exercício" : "exercícios"}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              Jogo — todos jogam a mesma partida ao mesmo tempo
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ARCADE_ORDER.map((slug) => {
                const identity = GAME_IDENTITIES[slug];
                const option = games.find((g) => slugForGameType(g.gameType) === slug);
                if (!option) return null;
                const selected = gameType === option.gameType;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setGameType(option.gameType)}
                    className={cn(
                      "rounded-[var(--radius-card)] border p-3 text-left transition-transform",
                      selected
                        ? "border-transparent ring-2 ring-offset-2"
                        : "border-[var(--color-border)] hover:-translate-y-0.5",
                    )}
                    style={
                      selected
                        ? {
                            background: `linear-gradient(180deg, ${identity.from}, ${identity.to})`,
                            color: "white",
                            ["--tw-ring-color" as string]: identity.glow,
                          }
                        : undefined
                    }
                  >
                    <p className="text-sm font-bold">{identity.name}</p>
                    <p
                      className={cn(
                        "text-xs",
                        selected ? "opacity-80" : "text-[var(--color-muted-foreground)]",
                      )}
                    >
                      {identity.skill}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}

        <Button type="submit" disabled={loading || !canSubmit}>
          {loading ? "Criando..." : "Criar sala"}
        </Button>
      </form>
    </Card>
  );
}
