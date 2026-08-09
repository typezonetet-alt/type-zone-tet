import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { API_URL } from "@/lib/api";
import { getServerUser } from "@/lib/session";
import {
  getServerClass,
  getServerPracticeFrequency,
  getServerSeasonRankingForClass,
  getServerStudentEvolution,
  getServerTrailCompletion,
} from "@/lib/server-api";

function csvLink(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${API_URL}${path}${separator}format=csv`;
}

function DownloadCsv({ path }: { path: string }) {
  return (
    <a
      href={csvLink(path)}
      className="text-xs font-medium text-[var(--color-primary)] hover:underline"
    >
      Baixar CSV
    </a>
  );
}

export default async function ClassReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ studentId?: string }>;
}) {
  const { id } = await params;
  const { studentId } = await searchParams;
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role === Role.STUDENT) redirect("/aprender");

  const { status, classDetail } = await getServerClass(id);
  if (status === 403) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <Card>
          <CardDescription>Você não tem acesso a esta turma.</CardDescription>
        </Card>
      </main>
    );
  }
  if (!classDetail) notFound();

  const [frequency, trail, ranking] = await Promise.all([
    getServerPracticeFrequency(id),
    getServerTrailCompletion(id),
    getServerSeasonRankingForClass(id),
  ]);

  const evolution = studentId ? await getServerStudentEvolution(id, studentId) : null;
  const selectedStudent = classDetail.students.find((s) => s.id === studentId);

  const trailByStudent = new Map<string, { name: string; completed: number; total: number }>();
  for (const row of trail) {
    const current = trailByStudent.get(row.studentId) ?? {
      name: row.studentName,
      completed: 0,
      total: 0,
    };
    current.total += 1;
    if (row.passed) current.completed += 1;
    trailByStudent.set(row.studentId, current);
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link
          href={`/gestao/turmas/${id}`}
          className="text-sm text-[var(--color-primary)] hover:underline"
        >
          ← {classDetail.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Relatórios</h1>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Frequência de prática</CardTitle>
          <DownloadCsv path={`/classes/${id}/reports/practice-frequency`} />
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-muted)] text-left">
              <tr>
                <th className="p-3 font-medium">Aluno</th>
                <th className="p-3 font-medium">Dias ativos</th>
                <th className="p-3 font-medium">Minutos totais</th>
                <th className="p-3 font-medium">Média min/dia ativo</th>
              </tr>
            </thead>
            <tbody>
              {frequency.map((row) => (
                <tr key={row.studentId} className="border-t border-[var(--color-border)]">
                  <td className="p-3">{row.studentName}</td>
                  <td className="p-3">{row.daysActive}</td>
                  <td className="p-3">{row.totalMinutes}</td>
                  <td className="p-3">{row.avgMinutesPerActiveDay}</td>
                </tr>
              ))}
              {frequency.length === 0 ? (
                <tr>
                  <td className="p-3 text-[var(--color-muted-foreground)]" colSpan={4}>
                    Sem dados de prática ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Conclusão de trilha</CardTitle>
          <DownloadCsv path={`/classes/${id}/reports/trail-completion`} />
        </div>
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Resumo por aluno — o CSV traz o detalhe exercício a exercício.
        </p>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-muted)] text-left">
              <tr>
                <th className="p-3 font-medium">Aluno</th>
                <th className="p-3 font-medium">Exercícios concluídos</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(trailByStudent.entries()).map(([id2, row]) => (
                <tr key={id2} className="border-t border-[var(--color-border)]">
                  <td className="p-3">{row.name}</td>
                  <td className="p-3">
                    {row.completed}/{row.total}
                  </td>
                </tr>
              ))}
              {trailByStudent.size === 0 ? (
                <tr>
                  <td className="p-3 text-[var(--color-muted-foreground)]" colSpan={2}>
                    Nenhum exercício publicado ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Ranking da temporada</CardTitle>
          <DownloadCsv path={`/classes/${id}/reports/season-ranking`} />
        </div>
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-muted)] text-left">
              <tr>
                <th className="p-3 font-medium">Posição</th>
                <th className="p-3 font-medium">Aluno</th>
                <th className="p-3 font-medium">Liga</th>
                <th className="p-3 font-medium">Pontos</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((entry) => (
                <tr key={entry.studentId} className="border-t border-[var(--color-border)]">
                  <td className="p-3">{entry.rank}</td>
                  <td className="p-3">{entry.name}</td>
                  <td className="p-3">
                    <Badge variant="muted">{entry.league}</Badge>
                  </td>
                  <td className="p-3">{entry.points}</td>
                </tr>
              ))}
              {ranking.length === 0 ? (
                <tr>
                  <td className="p-3 text-[var(--color-muted-foreground)]" colSpan={4}>
                    Sem pontuação de temporada ainda.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Evolução do aluno</CardTitle>
          {studentId ? (
            <DownloadCsv
              path={`/classes/${id}/reports/students/${studentId}/evolution`}
            />
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {classDetail.students.map((student) => (
            <Link
              key={student.id}
              href={`/gestao/turmas/${id}/relatorios?studentId=${student.id}`}
              className={cn(
                buttonVariants({
                  variant: student.id === studentId ? "primary" : "ghost",
                  size: "sm",
                }),
              )}
            >
              {student.name}
            </Link>
          ))}
        </div>

        {studentId && evolution ? (
          <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-muted)] text-left">
                <tr>
                  <th className="p-3 font-medium">Data</th>
                  <th className="p-3 font-medium">Exercício</th>
                  <th className="p-3 font-medium">Precisão</th>
                  <th className="p-3 font-medium">PPM</th>
                  <th className="p-3 font-medium">Passou</th>
                </tr>
              </thead>
              <tbody>
                {evolution.map((row) => (
                  <tr key={row.attemptId} className="border-t border-[var(--color-border)]">
                    <td className="p-3">
                      {new Date(row.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">
                      {row.worldTitle} · {row.exerciseTitle}
                    </td>
                    <td className="p-3">{Math.round(row.accuracy * 100)}%</td>
                    <td className="p-3">{row.wpmNet.toFixed(1)}</td>
                    <td className="p-3">
                      <Badge variant={row.passed ? "success" : "muted"}>
                        {row.passed ? "Sim" : "Não"}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {evolution.length === 0 ? (
                  <tr>
                    <td className="p-3 text-[var(--color-muted-foreground)]" colSpan={5}>
                      {selectedStudent?.name ?? "Este aluno"} ainda não tem tentativas
                      registradas.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Selecione um aluno para ver o histórico de tentativas.
          </p>
        )}
      </section>
    </main>
  );
}
