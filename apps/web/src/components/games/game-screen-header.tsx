import Link from "next/link";
import type { ReactNode } from "react";
import { GAME_IDENTITIES, type GameSlug } from "./game-identity";

// Cabeçalho comum das telas de jogo. O "Arcade" é um link de volta de verdade
// (antes era só um rótulo morto), então dá pra trocar de máquina sem usar o
// botão voltar do navegador.
export function GameScreenHeader({
  slug,
  children,
}: {
  slug: GameSlug;
  children?: ReactNode;
}) {
  const id = GAME_IDENTITIES[slug];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Link
          href="/jogar"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          ← Arcade
        </Link>
        <h1 className="text-2xl font-black tracking-tight">{id.name}</h1>
      </div>
      {children ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
          {children}
        </div>
      ) : null}
    </div>
  );
}
