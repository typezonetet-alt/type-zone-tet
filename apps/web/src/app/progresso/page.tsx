import Link from "next/link";
import { redirect } from "next/navigation";
import { CosmeticType, League, type LeaderboardScope } from "@tt-digita/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getServerUser } from "@/lib/session";
import {
  getServerAchievements,
  getServerCosmetics,
  getServerLeaderboard,
  getServerMissions,
  getServerProfile,
  getServerSeason,
} from "@/lib/server-api";
import { CosmeticActions } from "./cosmetic-actions";

const LEAGUE_LABEL: Record<League, string> = {
  [League.BRONZE]: "Bronze",
  [League.PRATA]: "Prata",
  [League.OURO]: "Ouro",
  [League.PLATINA]: "Platina",
  [League.DIAMANTE]: "Diamante",
  [League.MESTRE]: "Mestre",
  [League.LENDA]: "Lenda T&T",
};

const COSMETIC_TYPE_LABEL: Record<CosmeticType, string> = {
  [CosmeticType.AVATAR_FRAME]: "Molduras",
  [CosmeticType.THEME]: "Temas",
  [CosmeticType.TITLE]: "Títulos",
};

export default async function ProgressoPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string }>;
}) {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  const scope: LeaderboardScope = (await searchParams).scope === "turma" ? "turma" : "geral";

  const [profile, missions, achievements, cosmetics, season, leaderboard] =
    await Promise.all([
      getServerProfile(),
      getServerMissions(),
      getServerAchievements(),
      getServerCosmetics(),
      getServerSeason(),
      getServerLeaderboard(scope),
    ]);

  if (!profile || !season) {
    redirect("/dashboard");
  }

  const cosmeticsByType = new Map<CosmeticType, typeof cosmetics>();
  for (const item of cosmetics) {
    const list = cosmeticsByType.get(item.type) ?? [];
    list.push(item);
    cosmeticsByType.set(item.type, list);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">Progresso</p>
          <h1 className="text-2xl font-semibold">Nível {profile.level}</h1>
        </div>
        <Link href="/aprender" className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          Voltar a treinar
        </Link>
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardDescription>XP</CardDescription>
            <p className="text-sm font-medium">
              {profile.xpIntoLevel} / {profile.xpForNextLevel} até o nível {profile.level + 1}
            </p>
          </div>
          <Badge variant="accent">{profile.coins} moedas</Badge>
          <Badge variant={profile.currentStreak > 0 ? "success" : "muted"}>
            🔥 {profile.currentStreak} {profile.currentStreak === 1 ? "dia" : "dias"} seguidos
          </Badge>
          <Badge variant="primary">{LEAGUE_LABEL[season.league]}</Badge>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-muted)]">
          <div
            className="h-full rounded-full bg-[var(--color-primary)]"
            style={{
              width: `${Math.min(100, Math.round((profile.xpIntoLevel / Math.max(1, profile.xpForNextLevel)) * 100))}%`,
            }}
          />
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Temporada {season.index} · {season.points} pontos
          {season.nextLeague
            ? ` · faltam ${season.pointsToNextLeague} pontos para ${LEAGUE_LABEL[season.nextLeague]}`
            : " · liga máxima"}
        </p>
      </Card>

      <section className="space-y-3">
        <CardTitle className="text-base">Missões de hoje</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {missions.map((mission) => (
            <Card key={mission.key} className={mission.completed ? "opacity-70" : ""}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{mission.title}</p>
                  <CardDescription>{mission.description}</CardDescription>
                </div>
                {mission.completed ? <Badge variant="success">Concluída</Badge> : null}
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
                <div
                  className="h-full rounded-full bg-[var(--color-secondary)]"
                  style={{
                    width: `${Math.min(100, Math.round((mission.progress / mission.target) * 100))}%`,
                  }}
                />
              </div>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                +{mission.xpReward} XP · +{mission.coinReward} moedas
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <CardTitle className="text-base">Conquistas</CardTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          {achievements.map((achievement) => (
            <Card
              key={achievement.key}
              className={achievement.unlocked ? "" : "opacity-50"}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{achievement.title}</p>
                  <CardDescription>{achievement.description}</CardDescription>
                </div>
                <Badge variant={achievement.unlocked ? "success" : "muted"}>
                  {achievement.unlocked ? "Desbloqueada" : "Bloqueada"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <CardTitle className="text-base">Loja de cosméticos</CardTitle>
        {Array.from(cosmeticsByType.entries()).map(([type, items]) => (
          <div key={type} className="space-y-3">
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
              {COSMETIC_TYPE_LABEL[type]}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item) => (
                <Card key={item.id} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <CardDescription>
                      {item.cost === 0 ? "Grátis" : `${item.cost} moedas`} · nível{" "}
                      {item.requiredLevel}+
                    </CardDescription>
                  </div>
                  <CosmeticActions
                    cosmetic={item}
                    studentLevel={profile.level}
                    studentCoins={profile.coins}
                  />
                </Card>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ranking da temporada</CardTitle>
          <div className="flex gap-2 text-xs">
            <Link
              href="/progresso?scope=geral"
              className={cn(
                buttonVariants({ variant: scope === "geral" ? "primary" : "ghost", size: "sm" }),
              )}
            >
              Geral
            </Link>
            <Link
              href="/progresso?scope=turma"
              className={cn(
                buttonVariants({ variant: scope === "turma" ? "primary" : "ghost", size: "sm" }),
              )}
            >
              Turma
            </Link>
          </div>
        </div>
        <Card className="divide-y divide-[var(--color-border)] p-0">
          {leaderboard.length === 0 ? (
            <p className="p-4 text-sm text-[var(--color-muted-foreground)]">
              Ainda não há pontuação registrada nesta temporada.
            </p>
          ) : (
            leaderboard.map((entry) => (
              <div
                key={entry.studentId}
                className={cn(
                  "flex items-center justify-between gap-3 p-4 text-sm",
                  entry.isCurrentStudent ? "bg-[var(--color-muted)]" : "",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center font-semibold text-[var(--color-muted-foreground)]">
                    {entry.rank}
                  </span>
                  <span className="font-medium">{entry.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="muted">{LEAGUE_LABEL[entry.league]}</Badge>
                  <span className="font-semibold">{entry.points} pts</span>
                </div>
              </div>
            ))
          )}
        </Card>
      </section>
    </main>
  );
}
