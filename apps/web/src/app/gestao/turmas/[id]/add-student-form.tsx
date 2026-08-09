"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { BulkImportResult, CreatedCredentials } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import {
  addExistingStudentToClass,
  ApiError,
  createStudentInClass,
  createStudentsBulk,
} from "@/lib/api";

export function AddStudentForm({ classId }: { classId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"new" | "existing" | "bulk">("new");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [namesText, setNamesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (mode === "new") {
        const created = await createStudentInClass(classId, { name });
        setCredentials(created);
        setName("");
      } else if (mode === "existing") {
        await addExistingStudentToClass(classId, code);
        setCode("");
      } else {
        const names = namesText
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const result = await createStudentsBulk(classId, names);
        setBulkResult(result);
        setNamesText("");
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
        <span className="text-[var(--color-muted-foreground)]">·</span>
        <button
          type="button"
          className={mode === "bulk" ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"}
          onClick={() => setMode("bulk")}
        >
          Em lote
        </button>
      </div>

      {mode === "bulk" ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="bulk-names" className="text-sm font-medium">
              Um nome por linha
            </label>
            <textarea
              id="bulk-names"
              value={namesText}
              onChange={(e) => setNamesText(e.target.value)}
              required
              rows={5}
              placeholder={"Maria Silva\nJoão Souza\nAna Pereira"}
              className="w-full rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2.5 text-sm outline-none placeholder:text-[var(--color-muted-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
            />
          </div>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "Importando..." : "Importar alunos"}
          </Button>
        </form>
      ) : (
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
      )}

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

      {bulkResult ? (
        <div className="space-y-2 rounded-[var(--radius-card)] bg-[var(--color-success)]/10 p-3 text-sm">
          <p className="font-medium">
            {bulkResult.created.length} aluno(s) criado(s) — anote agora, as senhas não serão mostradas de novo:
          </p>
          <div className="max-h-48 space-y-1 overflow-y-auto font-mono text-xs">
            {bulkResult.created.map((student) => (
              <p key={student.code}>
                {student.name} — {student.code} / {student.temporaryPassword}
              </p>
            ))}
          </div>
          {bulkResult.failed.length > 0 ? (
            <div className="space-y-1 border-t border-[var(--color-border)] pt-2 text-xs text-[var(--color-error)]">
              <p className="font-medium">Não importados:</p>
              {bulkResult.failed.map((failure, index) => (
                <p key={`${failure.name}-${index}`}>
                  {failure.name || "(vazio)"} — {failure.reason}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
