import Link from "next/link";
import { redirect } from "next/navigation";
import { Role } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { getServerUser } from "@/lib/session";
import { getServerAuditLog } from "@/lib/server-api";

export default async function AuditLogPage() {
  const user = await getServerUser();
  if (!user) redirect("/login");
  if (user.role !== Role.SUPERADMIN) redirect("/gestao");

  const logs = await getServerAuditLog({});

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <Link href="/gestao" className="text-sm text-[var(--color-primary)] hover:underline">
          ← Gestão
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Auditoria</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Últimos 200 registros — tela restrita ao superadministrador.
        </p>
      </div>

      <Card className="divide-y divide-[var(--color-border)] p-0">
        {logs.length === 0 ? (
          <CardDescription className="p-4">Nenhum registro ainda.</CardDescription>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="space-y-1 p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-sm">{log.action}</CardTitle>
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {new Date(log.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Usuário: {log.userId ?? "sistema"}
              </p>
              {log.metadata ? (
                <pre className="overflow-x-auto rounded bg-[var(--color-muted)] p-2 text-xs">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              ) : null}
            </div>
          ))
        )}
      </Card>
    </main>
  );
}
