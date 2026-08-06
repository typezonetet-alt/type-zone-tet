// Dronezinho de defesa do T&T Orbital. O "olho" central acende com a cor de
// destaque da marca a cada tiro -- ver logica de disparo em orbital-board.tsx.
export function OrbitalShip({ firing }: { firing: boolean }) {
  return (
    <svg
      width="72"
      height="58"
      viewBox="0 0 72 58"
      className="overflow-visible drop-shadow-[0_0_10px_rgba(6,182,212,0.45)]"
      aria-hidden
    >
      <ellipse cx="36" cy="54" rx="22" ry="3" fill="var(--color-secondary)" opacity="0.25" />
      <path d="M16 20 L4 27 L16 33 Z" fill="var(--color-primary)" />
      <path d="M56 20 L68 27 L56 33 Z" fill="var(--color-primary)" />
      <path
        d="M36 6 L54 18 L50 40 L22 40 L18 18 Z"
        fill="#0b1220"
        stroke="var(--color-secondary)"
        strokeWidth="1.5"
      />
      <path d="M27 40 L26 46 L46 46 L45 40 Z" fill="#0b1220" stroke="var(--color-secondary)" strokeWidth="1" />
      <circle
        cx="36"
        cy="24"
        r={firing ? 7 : 5.5}
        fill={firing ? "var(--color-accent)" : "var(--color-secondary)"}
        className="transition-all duration-100"
      />
      <circle cx="36" cy="24" r="2.2" fill="#0b1220" />
    </svg>
  );
}
