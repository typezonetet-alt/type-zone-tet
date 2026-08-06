import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerUser } from "@/lib/session";
import { getServerTeachers } from "@/lib/server-api";
import { CreateTeacherForm } from "./create-teacher-form";

export default async function ProfessoresPage() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
  if (user.role !== Role.ADMIN && user.role !== Role.SUPERADMIN) {
    redirect("/gestao");
  }

  const teachers = await getServerTeachers();

  return (
    <main className="mx-auto max-w-2xl space-y-8 p-6">
      <div>
        <Link href="/gestao" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Gestão
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Professores</h1>
      </div>

      <CreateTeacherForm />

      <ol className="space-y-3">
        {teachers.map((teacher) => (
          <li key={teacher.id}>
            <Card>
              <CardTitle className="text-base">{teacher.name}</CardTitle>
              <CardDescription>
                {teacher.email} · {teacher.classCount} {teacher.classCount === 1 ? "turma" : "turmas"}
              </CardDescription>
            </Card>
          </li>
        ))}
        {teachers.length === 0 ? (
          <Card>
            <CardDescription>Nenhum professor cadastrado ainda.</CardDescription>
          </Card>
        ) : null}
      </ol>
    </main>
  );
}
