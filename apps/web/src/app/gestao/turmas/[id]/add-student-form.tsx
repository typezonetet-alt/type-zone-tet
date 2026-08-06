"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreatedCredentials } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { addExistingStudentToClass, ApiError, createStudentInClass } from "@/lib/api";

export function AddStudentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "new") {
        const created = await createStudentInClass(classId, { name });
        setCredentials(created);
        setName("");
      } else {
        await addExistingStudentToClass(classId, code);
        setCode("");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível adicionar o aluno.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">Adicionar aluno</CardTitle>

      <div className="flex gap-2 text-sm">
        <button
          type="button"
          className={mode === "new" ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}
          onClick={() => setMode("new")}
        >
          Criar novo
        </button>
        <span className="text-[var(--color-muted-foreground)]">·</span>
        <button
          type="button"
          className={mode === "existing" ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}
          onClick={() => setMode("existing")}
        >
          Já tem código
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        {mode === "new" ? (
          <Input
            label="Nome do aluno"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="min-w-48 flex-1"
          />
        ) : (
          <Input
            label="Código do aluno"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="min-w-48 flex-1"
          />
        )}
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Adicionando..." : "Adicionar"}
        </Button>
      </form>

      {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}

      {credentials ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--color-success)]/10 p-3 text-sm">
          <p className="font-medium">Aluno criado — anote agora, a senha não será mostrada de novo:</p>
          <p>
            Código: <span className="font-mono">{credentials.code}</span> · Senha temporária:{" "}
            <span className="font-mono">{credentials.temporaryPassword}</span>
          </p>
        </div>
      ) : null}
    </Card>
  );
}
