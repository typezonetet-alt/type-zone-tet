// Mascote da T&T: uma "tecla" arredondada com rosto -- identidade propria,
// tematica de teclado (nao um bicho generico). Reaproveitada em qualquer tela
// que precise de um toque de personalidade (trilha, vazios, celebracoes).
export function TtMascot({
  size = 64,
  mood = "happy",
  className,
}: {
  size?: number;
  mood?: "happy" | "wink" | "sleepy";
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      aria-hidden="true"
    >
      <rect x="4" y="4" width="56" height="56" rx="16" fill="var(--color-primary)" />
      <rect
        x="4"
        y="4"
        width="56"
        height="56"
        rx="16"
        fill="none"
        stroke="var(--color-primary-foreground)"
        strokeOpacity="0.15"
        strokeWidth="3"
      />
      {/* "tecla" em relevo */}
      <rect x="12" y="10" width="40" height="8" rx="4" fill="white" fillOpacity="0.18" />

      {mood === "sleepy" ? (
        <>
          <path d="M20 30q4 -4 8 0" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M36 30q4 -4 8 0" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : mood === "wink" ? (
        <>
          <circle cx="24" cy="30" r="3.5" fill="white" />
          <path d="M36 30q4 -3 8 0" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="24" cy="30" r="3.5" fill="white" />
          <circle cx="40" cy="30" r="3.5" fill="white" />
        </>
      )}

      <path
        d="M22 42q10 8 20 0"
        stroke="white"
        strokeWidth="3.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
