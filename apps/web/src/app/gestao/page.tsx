import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getServerUser } from "@/lib/session";
import { getServerAdminOverview, getServerClasses } from "@/lib/server-api";
import { NewClassForm } from "./new-class-form";

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativa",
  SUSPENDED: "Suspensa",
  ARCHIVED: "Arquivada",
};

export default async function GestaoPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role === Role.STUDENT) {
    redirect("/aprender");
  }

  const isAdmin = user.role === Role.ADMIN || user.role === Role.SUPERADMIN;
  const [overview, classes] = await Promise.all([
    isAdmin ? getServerAdminOverview() : Promise.resolve(null),
    getServerClasses(),
  ]);

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[var(--color-primary)]">Gestão</p>
          <h1 className="text-2xl font-semibold">
            {isAdmin ? "Painel do administrador" : "Minhas turmas"}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin ? (
            <Link
              href="/gestao/analytics"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Analytics
            </Link>
          ) : null}
          {user.role === Role.SUPERADMIN ? (
            <Link
              href="/gestao/auditoria"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Auditoria
            </Link>
          ) : null}
          <Link href="/gestao/salas" className={cn(buttonVariants({ variant: "accent", size: "sm" }))}>
            Criar sala ao vivo
          </Link>
        </div>
      </div>

      {overview ? (
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardDescription>Professores</CardDescription>
            <p className="text-2xl font-semibold">{overview.teacherCount}</p>
          </Card>
          <Card>
            <CardDescription>Turmas</CardDescription>
            <p className="text-2xl font-semibold">{overview.classCount}</p>
          </Card>
          <Card>
            <CardDescription>Alunos</CardDescription>
            <p className="text-2xl font-semibold">{overview.studentCount}</p>
          </Card>
        </div>
      ) : null}

      {isAdmin ? (
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Turmas</h2>
          <div className="flex items-center gap-3">
            <Link href="/gestao/professores" className="text-sm text-[var(--color-primary)] hover:underline">
              Gerenciar professores
            </Link>
            <NewClassForm />
          </div>
        </div>
      ) : null}

      <ol className="space-y-3">
        {classes.map((cls) => (
          <li key={cls.id}>
            <Link href={`/gestao/turmas/${cls.id}`}>
              <Card className="transition-shadow hover:shadow-lg">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-base">{cls.name}</CardTitle>
                    <CardDescription>
                      {cls.teacherName ?? "Sem professor"} · {cls.studentCount}{" "}
                      {cls.studentCount === 1 ? "aluno" : "alunos"}
                      {cls.course ? ` · ${cls.course}` : ""}
                      {cls.shift ? ` · ${cls.shift}` : ""}
                    </CardDescription>
                  </div>
                  <Badge variant={cls.status === "ACTIVE" ? "success" : "muted"}>
                    {STATUS_LABEL[cls.status] ?? cls.status}
                  </Badge>
                </div>
              </Card>
            </Link>
          </li>
        ))}
        {classes.length === 0 ? (
          <Card>
            <CardDescription>
              {isAdmin ? "Nenhuma turma criada ainda." : "Você ainda não tem turmas atribuídas."}
            </CardDescription>
          </Card>
        ) : null}
      </ol>
    </main>
  );
}
