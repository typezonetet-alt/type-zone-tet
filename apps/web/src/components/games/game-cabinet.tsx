import Link from "next/link";
import type { GameBest } from "@tt-digita/shared";
import { GameArt } from "./game-art";
import { GAME_IDENTITIES, type GameSlug } from "./game-identity";

// Um gabinete de fliperama. A "aresta" 3D é box-shadow (não border), porque
// box-shadow não ocupa espaço: o gabinete pode afundar ao ser pressionado sem
// empurrar os vizinhos da grade um pixel sequer.
export function GameCabinet({
  slug,
  best,
  featured = false,
  index = 0,
}: {
  slug: GameSlug;
  best: GameBest | null;
  featured?: boolean;
  index?: number;
}) {
  const id = GAME_IDENTITIES[slug];
  const hasRecord = best?.score !== null && best?.score !== undefined;

  return (
    <Link
      href={`/jogar/${slug}`}
      className={
        "group block rounded-[26px] focus-visible:outline-2 focus-visible:outline-offset-4 " +
        (featured ? "sm:col-span-2" : "")
      }
      style={{ outlineColor: id.glow }}
    >
      <article
        className="relative overflow-hidden rounded-[26px] transition-[transform,box-shadow] duration-150 ease-out motion-safe:animate-[arcade-rise_.5s_ease-out_backwards] group-hover:-translate-y-1 group-active:translate-y-[5px]"
        style={{
          background: `linear-gradient(160deg, ${id.from} 0%, ${id.to} 100%)`,
          boxShadow: `0 7px 0 0 ${id.edge}, 0 18px 30px -12px rgba(0,0,0,.75)`,
          animationDelay: `${index * 70}ms`,
        }}
      >
        {/* Borda interna clara: dá o "vidro" do gabinete sem pesar. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[26px] ring-1 ring-inset"
          style={{ borderColor: "transparent", boxShadow: `inset 0 0 0 1px ${id.glow}33` }}
        />

        <div className={featured ? "sm:flex sm:items-stretch" : ""}>
          <div
            className={
              "relative shrink-0 overflow-hidden " +
              (featured ? "h-40 sm:h-auto sm:w-1/2" : "h-32")
            }
          >
            <GameArt slug={slug} glow={id.glow} />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{ background: `linear-gradient(to bottom, transparent 45%, ${id.to} 100%)` }}
            />
          </div>

          <div className={"relative p-5 " + (featured ? "sm:flex sm:flex-col sm:justify-center sm:p-7" : "")}>
            <p
              className="font-mono text-[10px] uppercase tracking-[0.18em]"
              style={{ color: id.glow }}
            >
              {id.skill}
            </p>
            <h2
              className={
                "mt-1 font-black tracking-tight text-white " +
                (featured ? "text-2xl sm:text-3xl" : "text-xl")
              }
            >
              {id.name}
            </h2>
            <p className={"mt-1 text-white/70 " + (featured ? "text-base" : "text-sm")}>
              {id.tagline}
            </p>

            <div className="mt-4 flex items-center gap-2">
              {hasRecord ? (
                <span
                  className="rounded-full px-3 py-1 font-mono text-xs font-bold"
                  style={{ backgroundColor: `${id.glow}22`, color: id.glow }}
                >
                  RECORDE {best.score}
                </span>
              ) : (
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-xs font-bold text-white/70">
                  NUNCA JOGADO
                </span>
              )}
              <span
                className="ml-auto text-lg transition-transform duration-150 group-hover:translate-x-1"
                style={{ color: id.glow }}
                aria-hidden="true"
              >
                ▸
              </span>
            </div>
          </div>
        </div>
      </article>
    </Link>
  );
}
