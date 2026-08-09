import type { PodiumEntry, RoomParticipantView } from "@tt-digita/shared";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

const MEDALS = ["🥇", "🥈", "🥉"];

// O evento PODIUM é efêmero (só quem estava conectado no exato momento em
// que a sala fechou o recebe) -- quem entra DEPOIS (reconexão, telão aberto
// tarde) nunca o veria. RoomState.participants já carrega a posição final
// (persistida) mesmo pra quem chega depois, então dá pra reconstruir um
// pódio equivalente a partir dela quando o evento ao vivo foi perdido.
export function podiumFromParticipants(participants: RoomParticipantView[]): PodiumEntry[] {
  return participants
    .filter((p): p is RoomParticipantView & { position: number } => p.position !== null)
    .sort((a, b) => a.position - b.position)
    .map((p) => ({
      studentId: p.studentId,
      name: p.name,
      position: p.position,
      totalPoints: p.totalPoints,
    }));
}

// Compartilhado com o telão (versão "large", sem Card em volta) e com o
// futuro pódio geral de /progresso -- ver PodiumRow abaixo.
export interface PodiumRowEntry {
  position: number;
  name: string;
  detail: string;
}

export function PodiumRow({
  entry,
  size = "normal",
}: {
  entry: PodiumRowEntry;
  size?: "normal" | "large";
}) {
  return (
    <li
      className={cn(
        "flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)]",
        size === "large" ? "p-6" : "p-3",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-3 font-medium",
          size === "large" ? "text-3xl gap-4" : "text-sm",
        )}
      >
        <span>{MEDALS[entry.position - 1] ?? `${entry.position}º`}</span>
        {entry.name}
      </span>
      <Badge variant="primary" className={size === "large" ? "text-xl px-4 py-2" : undefined}>
        {entry.detail}
      </Badge>
    </li>
  );
}

export function PodiumView({
  podium,
  size = "normal",
}: {
  podium: PodiumEntry[];
  size?: "normal" | "large";
}) {
  return (
    <Card className="space-y-3">
      <CardTitle className={size === "large" ? "text-2xl" : "text-base"}>Pódio</CardTitle>
      <ol className="space-y-2">
        {podium.map((entry) => (
          <PodiumRow
            key={entry.studentId}
            size={size}
            entry={{
              position: entry.position,
              name: entry.name,
              detail: `${entry.totalPoints} pts`,
            }}
          />
        ))}
        {podium.length === 0 ? (
          <li className="text-sm text-[var(--color-muted-foreground)]">
            Ninguém completou a prova.
          </li>
        ) : null}
      </ol>
    </Card>
  );
}
