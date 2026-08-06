// Cenario espacial do T&T Orbital: gradiente profundo + duas nebulosas nas
// cores da marca + duas camadas de estrelas com drift lento (paralaxe).
// Tudo em CSS/SVG, sem imagens externas (mesmo principio das ilustracoes de
// mao em components/typing/hands.tsx).
export function OrbitalBackground({ reducedEffects }: { reducedEffects: boolean }) {
  const driftClass = reducedEffects ? "" : "motion-safe:animate-[orbital-drift_70s_linear_infinite]";
  const driftClassSlow = reducedEffects ? "" : "motion-safe:animate-[orbital-drift_130s_linear_infinite]";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-10%,#182548_0%,#050914_65%)]" />
      <div className="absolute -left-16 top-6 h-64 w-64 rounded-full bg-[var(--color-primary)]/25 blur-3xl" />
      <div className="absolute -right-16 top-48 h-72 w-72 rounded-full bg-[var(--color-secondary)]/20 blur-3xl" />

      <div
        className={`absolute inset-0 opacity-80 ${driftClass}`}
        style={{
          backgroundImage:
            "radial-gradient(1.2px 1.2px at 20px 30px, white, transparent), radial-gradient(1px 1px at 90px 120px, white, transparent), radial-gradient(1.6px 1.6px at 160px 60px, white, transparent), radial-gradient(1px 1px at 210px 180px, white, transparent), radial-gradient(1.2px 1.2px at 40px 200px, white, transparent), radial-gradient(1px 1px at 240px 40px, white, transparent)",
          backgroundSize: "260px 260px",
        }}
      />
      <div
        className={`absolute inset-0 opacity-40 ${driftClassSlow}`}
        style={{
          backgroundImage:
            "radial-gradient(1.4px 1.4px at 60px 80px, white, transparent), radial-gradient(1px 1px at 140px 20px, white, transparent), radial-gradient(1.8px 1.8px at 190px 150px, white, transparent), radial-gradient(1px 1px at 20px 160px, white, transparent)",
          backgroundSize: "300px 300px",
        }}
      />
    </div>
  );
}
