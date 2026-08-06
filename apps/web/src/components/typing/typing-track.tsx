import { Card } from "@/components/ui/card";

export function TypingTrack({
  targetChars,
  position,
  wrongStreak,
}: {
  targetChars: string[];
  position: number;
  wrongStreak: number;
}) {
  return (
    <Card className="font-mono text-2xl leading-relaxed tracking-wide">
      {targetChars.map((char, i) => {
        const isDone = i < position;
        const isCurrent = i === position;
        const isWrong = isCurrent && wrongStreak > 0;
        return (
          <span
            key={isCurrent ? `current-${wrongStreak}` : i}
            className={
              isDone
                ? "text-[var(--color-success)]"
                : isWrong
                  ? "bg-[var(--color-error)]/15 text-[var(--color-error)] motion-safe:animate-[shake_0.25s_ease-in-out]"
                  : "text-[var(--color-muted-foreground)]"
            }
            style={
              isCurrent
                ? {
                    textDecoration: "underline",
                    textDecorationColor: "var(--color-accent)",
                    textDecorationThickness: "3px",
                  }
                : undefined
            }
          >
            {char}
          </span>
        );
      })}
    </Card>
  );
}
