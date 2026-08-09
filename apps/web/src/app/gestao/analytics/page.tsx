import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerUser } from "@/lib/session";
import { getServerProductAnalytics } from "@/lib/server-api";

function formatMinutes(minutes: number): string {
  return `${minutes.toLocaleString("pt-BR")} min`;
}

function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`;
}

export default async function AnalyticsPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) redirect("/gestao");

  const analytics = await getServerProductAnalytics();

  if (!analytics) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <Card>
          <CardDescription>Não foi possível carregar as métricas agora.</CardDescription>
        </Card>
      </main>
    );
  }

  const maxWeekly = Math.max(1, ...analytics.weeklyActiveTrend.map((w) => w.activeStudents));

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link href="/gestao" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Gestão
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Analytics de produto</h1>
      </div>

      <Card className="space-y-1 border-[var(--color-primary)]">
        <CardDescription>
          North Star · minutos de prática qualificada por aluno ativo
        </CardDescription>
        <p className="text-3xl font-bold text-[var(--color-primary)]">
          {formatMinutes(analytics.qualifiedPracticeMinutesPerActiveStudent)}
        </p>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Só conta minutos de dias em que o aluno realmente concluiu um exercício
          elegível — evita otimizar por tempo de tela sozinho.
        </p>
      </Card>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardDescription>Ativação</CardDescription>
          <p className="text-2xl font-semibold">
            {formatPercent(analytics.activationRate)}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {analytics.activatedStudents}/{analytics.totalStudents} alunos concluíram
            a primeira atividade
          </p>
        </Card>
        <Card>
          <CardDescription>Ativos nos últimos 7 dias</CardDescription>
          <p className="text-2xl font-semibold">{analytics.activeStudentsLast7Days}</p>
        </Card>
        <Card>
          <CardDescription>Minutos de prática (total)</CardDescription>
          <p className="text-2xl font-semibold">
            {formatMinutes(analytics.totalPracticeMinutes)}
          </p>
        </Card>
        <Card>
          <CardDescription>Exercícios concluídos</CardDescription>
          <p className="text-2xl font-semibold">{analytics.exercisesCompletedTotal}</p>
        </Card>
        <Card>
          <CardDescription>Precisão média</CardDescription>
          <p className="text-2xl font-semibold">
            {analytics.averageAccuracy !== null
              ? formatPercent(analytics.averageAccuracy)
              : "—"}
          </p>
        </Card>
        <Card>
          <CardDescription>PPM médio</CardDescription>
          <p className="text-2xl font-semibold">
            {analytics.averageWpmNet !== null ? analytics.averageWpmNet.toFixed(1) : "—"}
          </p>
        </Card>
        <Card>
          <CardDescription>Partidas de jogo</CardDescription>
          <p className="text-2xl font-semibold">{analytics.gamesPlayedTotal}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {analytics.studentsWhoPlayedGames} alunos jogaram
          </p>
        </Card>
        <Card>
          <CardDescription>Entradas em sala</CardDescription>
          <p className="text-2xl font-semibold">{analytics.roomParticipationsTotal}</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {analytics.studentsWhoJoinedRooms} alunos · {analytics.roomCompletionsTotal}{" "}
            completaram a prova
          </p>
        </Card>
        <Card>
          <CardDescription>Tempo até iniciar a sala</CardDescription>
          <p className="text-2xl font-semibold">
            {analytics.averageSecondsToStartRoom !== null
              ? `${analytics.averageSecondsToStartRoom}s`
              : "—"}
          </p>
        </Card>
      </section>

      <section className="space-y-3">
        <CardTitle className="text-base">Alunos ativos por semana</CardTitle>
        <Card className="space-y-2">
          {analytics.weeklyActiveTrend.length === 0 ? (
            <CardDescription>Sem dados suficientes ainda.</CardDescription>
          ) : (
            analytics.weeklyActiveTrend.map((week) => (
              <div key={week.weekStart} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs text-[var(--color-muted-foreground)]">
                  {new Date(week.weekStart).toLocaleDateString("pt-BR")}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-muted)]">
                  <div
                    className="h-full rounded-full bg-[var(--color-secondary)]"
                    style={{ width: `${(week.activeStudents / maxWeekly) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right text-xs font-medium">
                  {week.activeStudents}
                </span>
              </div>
            ))
          )}
        </Card>
      </section>

      <p className="text-xs text-[var(--color-muted-foreground)]">
&ldquo;Abandono por tela&rdquo; (briefing §49) ainda não está aqui — exige instrumentação de
        eventos de navegação no frontend, fora do escopo desta leva.
      </p>
    </main>
  );
}
