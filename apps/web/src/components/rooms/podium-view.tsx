import type { PodiumEntry } from "@tt-digita/shared";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const MEDALS = ["🥇", "🥈", "🥉"];

export function PodiumView({ podium }: { podium: PodiumEntry[] }) {
  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">Pódio</CardTitle>
      <ol className="space-y-2">
        {podium.map((entry) => (
          <li
            key={entry.studentId}
            className="flex items-center justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] p-3"
          >
            <span className="flex items-center gap-2 font-medium">
              <span>{MEDALS[entry.position - 1] ?? `${entry.position}º`}</span>
              {entry.name}
            </span>
            <Badge variant="primary">
              {entry.wpmNet.toFixed(1)} WPM · {Math.round(entry.accuracy * 100)}%
            </Badge>
          </li>
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
