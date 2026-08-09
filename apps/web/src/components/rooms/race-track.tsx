"use client";

import type { RoomParticipantView } from "@tt-digita/shared";
import { brandColorFor } from "@/lib/palette";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export function RaceTrack({
  participants,
  currentStudentName,
}: {
  participants: RoomParticipantView[];
  currentStudentName?: string | null;
}) {
  return (
    <div className="space-y-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-muted)]/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
        T&T Turbo · pista ao vivo
      </p>
      {participants.map((participant, index) => {
        const color = brandColorFor(index);
        const isYou = participant.name === currentStudentName;
        const leftPercent = Math.min(92, Math.max(0, participant.progress * 92));

        return (
          <div key={participant.studentId} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span
                className={
                  isYou ? "font-semibold text-[var(--foreground)]" : "text-[var(--color-muted-foreground)]"
                }
              >
                {participant.name}
                {isYou ? " (você)" : ""}
              </span>
              {participant.finished ? (
                <span className="font-medium text-[var(--color-success)]">chegou 🏁</span>
              ) : !participant.connected ? (
                <span className="text-[var(--color-muted-foreground)]">offline</span>
              ) : null}
            </div>
            <div className="relative h-7 overflow-hidden rounded-full bg-white/70 dark:bg-black/25">
              <div className="absolute inset-y-0 right-2 flex items-center text-[11px] opacity-60">
                🏁
              </div>
              <div
                className="absolute inset-y-0 flex items-center transition-[left] duration-200 ease-linear"
                style={{ left: `${leftPercent}%` }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md"
                  style={{ backgroundColor: color }}
                >
                  {initials(participant.name)}
                </span>
              </div>
            </div>
          </div>
        );
      })}
      {participants.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Sem participantes ainda.</p>
      ) : null}
    </div>
  );
}
