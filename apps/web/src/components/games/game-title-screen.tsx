"use client";

import type { ReactNode } from "react";
import type { GameBest } from "@tt-digita/shared";
import { GameArt } from "./game-art";
import { GAME_IDENTITIES, type GameSlug } from "./game-identity";

export interface HowToItem {
  /** Tecla, quando a dica for um atalho. */
  key?: string;
  text: string;
}

// Tela de título: a continuação direta do gabinete do arcade. Mesma paleta,
// mesmo diorama (só que grande) -- entrar no jogo não deve parecer que você
// trocou de aplicativo, e sim que a máquina ligou.
export function GameTitleScreen({
  slug,
  best,
  howTo,
  onPlay,
  children,
}: {
  slug: GameSlug;
  best: GameBest | null;
  howTo: HowToItem[];
  /** Botão JOGAR padrão. Omita e use `children` quando houver escolha antes. */
  onPlay?: () => void;
  /** Substitui o botão -- ex.: a grade de modos da Chuva de Palavras. */
  children?: ReactNode;
}) {
  const id = GAME_IDENTITIES[slug];
  const hasRecord = best?.score !== null && best?.score !== undefined;

  return (
    <section
      className="overflow-hidden rounded-[26px] text-white"
      style={{
        background: `linear-gradient(160deg, ${id.from} 0%, ${id.to} 100%)`,
        boxShadow: `0 7px 0 0 ${id.edge}, 0 22px 40px -18px rgba(0,0,0,.8)`,
      }}
    >
      <div className="relative h-40 sm:h-48">
        <GameArt slug={slug} glow={id.glow} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: `linear-gradient(to bottom, transparent 35%, ${id.to} 100%)` }}
        />
      </div>

      <div className="relative px-6 pb-8 text-center sm:px-10">
        <p
          className="font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: id.glow }}
        >
          {id.skill}
        </p>
        <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">{id.name}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-white/70">{id.tagline}</p>

        {hasRecord ? (
          <p
            className="mt-4 inline-block rounded-full px-4 py-1.5 font-mono text-sm font-bold"
            style={{ backgroundColor: `${id.glow}22`, color: id.glow }}
          >
            SEU RECORDE {best.score}
          </p>
        ) : (
          <p className="mt-4 inline-block rounded-full bg-white/10 px-4 py-1.5 font-mono text-sm font-bold text-white/70">
            PRIMEIRA PARTIDA
          </p>
        )}

        <div className="mt-6">
          {children ?? (
            <button
              type="button"
              onClick={onPlay}
              className="w-full max-w-xs rounded-2xl px-8 py-4 text-lg font-black uppercase tracking-wide transition-transform duration-150 ease-out hover:-translate-y-0.5 active:translate-y-[5px] focus-visible:outline-2 focus-visible:outline-offset-4 sm:w-auto"
              style={{
                backgroundColor: id.glow,
                color: id.to,
                boxShadow: `0 6px 0 0 rgba(0,0,0,.35)`,
                outlineColor: id.glow,
              }}
            >
              Jogar
            </button>
          )}
        </div>

        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/55">
          {howTo.map((item) => (
            <li key={item.text} className="flex items-center gap-1.5">
              {item.key ? (
                <kbd
                  className="rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white/85"
                >
                  {item.key}
                </kbd>
              ) : null}
              {item.text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
