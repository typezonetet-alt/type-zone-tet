import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { getServerUser } from "@/lib/session";
import { getServerGameBests, getServerProfile } from "@/lib/server-api";
import { GameCabinet } from "@/components/games/game-cabinet";
import { ARCADE_ORDER, GAME_API_SLUG } from "@/components/games/game-identity";

export default async function JogarPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.STUDENT) {
    redirect("/gestao");
  }

  const [bests, profile] = await Promise.all([
    getServerGameBests(ARCADE_ORDER.map((slug) => GAME_API_SLUG[slug])),
    getServerProfile(),
  ]);

  return (
    // O arcade é um cômodo escuro dentro de um app claro. A separação é
    // proposital: "jogar" não deve parecer a mesma tela de "estudar".
    <main className="flex-1 bg-[#080d1c] px-5 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-white/45">
              T&amp;T Digita
            </p>
            <h1 className="mt-1 text-4xl font-black tracking-tight sm:text-5xl">Arcade</h1>
            <p className="mt-2 max-w-md text-sm text-white/55">
              Cinco máquinas, cinco habilidades. Escolha uma e bata seu recorde.
            </p>
          </div>

          {profile ? (
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="rounded-full bg-white/10 px-3 py-1.5 font-bold text-white/80">
                NÍVEL {profile.level}
              </span>
              <span className="rounded-full bg-[#facc15]/15 px-3 py-1.5 font-bold text-[#facc15]">
                {profile.coins} ◎
              </span>
            </div>
          ) : null}
        </header>

        <div className="grid gap-5 sm:grid-cols-2">
          {ARCADE_ORDER.map((slug, index) => (
            <GameCabinet
              key={slug}
              slug={slug}
              best={bests[GAME_API_SLUG[slug]] ?? null}
              featured={index === 0}
              index={index}
            />
          ))}
        </div>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-6 text-sm">
          <Link href="/aprender" className="text-white/55 transition-colors hover:text-white">
            ← Voltar para a trilha
          </Link>
          <Link href="/competir" className="text-white/55 transition-colors hover:text-white">
            Competir ao vivo →
          </Link>
        </nav>
      </div>
    </main>
  );
}
