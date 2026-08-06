import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getServerUser } from "@/lib/session";
import { getServerClass } from "@/lib/server-api";
import { AddStudentForm } from "./add-student-form";
import { ResetProgressButton } from "./reset-progress-button";

function formatDate(iso: string | null): string {
  if (!iso) return "Nunca praticou";
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === Role.STUDENT) {
    redirect("/aprender");
  }

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
  if (!classDetail) {
    notFound();
  }

  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPERADMIN;

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link href="/gestao" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Turmas
        </Link>
        <div className="mt-1 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold">{classDetail.name}</h1>
          <Badge variant={classDetail.status === "ACTIVE" ? "success" : "muted"}>
            {classDetail.status}
          </Badge>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {classDetail.teacherName ?? "Sem professor"}
          {classDetail.course ? ` · ${classDetail.course}` : ""}
          {classDetail.shift ? ` · ${classDetail.shift}` : ""}
        </p>
      </div>

      {classDetail.weakKeys.length > 0 ? (
        <Card className="space-y-3">
          <CardTitle className="text-base">Teclas fracas da turma</CardTitle>
          <div className="flex flex-wrap gap-2">
            {classDetail.weakKeys.map((key) => (
              <Badge key={key.char} variant="error">
                {key.char === " " ? "espaço" : key.char} · {Math.round(key.errorRate * 100)}% de erro
              </Badge>
            ))}
          </div>
        </Card>
      ) : null}

      {isAdmin ? <AddStudentForm classId={classDetail.id} /> : null}

      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-muted)] text-left">
            <tr>
              <th className="p-3 font-medium">Aluno</th>
              <th className="p-3 font-medium">Código</th>
              <th className="p-3 font-medium">Progresso</th>
              <th className="p-3 font-medium">Precisão média</th>
              <th className="p-3 font-medium">WPM médio</th>
              <th className="p-3 font-medium">Última prática</th>
              {isAdmin ? <th className="p-3 font-medium">Ações</th> : null}
            </tr>
          </thead>
          <tbody>
            {classDetail.students.map((student) => (
              <tr key={student.id} className="border-t border-[var(--color-border)]">
                <td className="p-3">{student.name}</td>
                <td className="p-3 font-mono">{student.code}</td>
                <td className="p-3">
                  {student.exercisesCompleted}/{student.exercisesTotal}
                </td>
                <td className="p-3">
                  {student.bestAccuracyAvg !== null ? `${Math.round(student.bestAccuracyAvg * 100)}%` : "—"}
                </td>
                <td className="p-3">
                  {student.bestWpmAvg !== null ? student.bestWpmAvg.toFixed(1) : "—"}
                </td>
                <td className="p-3">{formatDate(student.lastPracticeAt)}</td>
                {isAdmin ? (
                  <td className="p-3">
                    <ResetProgressButton studentId={student.id} studentName={student.name} />
                  </td>
                ) : null}
              </tr>
            ))}
            {classDetail.students.length === 0 ? (
              <tr>
                <td className="p-3 text-[var(--color-muted-foreground)]" colSpan={isAdmin ? 7 : 6}>
                  Nenhum aluno nesta turma ainda.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
