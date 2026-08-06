import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { getServerUser } from "@/lib/session";
import { LogoutButton } from "./logout-button";

const ROLE_LABEL: Record<Role, string> = {
  [Role.STUDENT]: "Aluno",
  [Role.TEACHER]: "Professor",
  [Role.ADMIN]: "Administrador",
  [Role.SUPERADMIN]: "Superadministrador",
};

export default async function DashboardPage() {
  const user = await getServerUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <CardTitle>Olá, {user.name}</CardTitle>
              <Badge variant="primary">{ROLE_LABEL[user.role]}</Badge>
            </div>
            <CardDescription>Sessão validada pela API — Fase 0 concluída.</CardDescription>
          </CardHeader>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            {user.code ? (
              <div>
                <dt className="text-[var(--color-muted-foreground)]">Código</dt>
                <dd className="font-medium">{user.code}</dd>
              </div>
            ) : null}
            {user.email ? (
              <div>
                <dt className="text-[var(--color-muted-foreground)]">E-mail</dt>
                <dd className="font-medium">{user.email}</dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-6 flex items-center gap-3">
            {user.role === Role.STUDENT ? (
              <Link href="/aprender" className={cn(buttonVariants({ variant: "primary" }))}>
                Continuar treino
              </Link>
            ) : (
              <Link href="/gestao" className={cn(buttonVariants({ variant: "primary" }))}>
                Ir para gestão
              </Link>
            )}
            <LogoutButton />
          </div>
        </Card>

        <p className="text-center text-xs text-[var(--color-muted-foreground)]">
          Jogos e salas ao vivo entram nas próximas fases (docs/briefing.md, §52).
        </p>
      </div>
    </main>
  );
}
