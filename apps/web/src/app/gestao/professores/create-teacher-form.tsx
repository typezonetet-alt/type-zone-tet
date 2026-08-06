"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { CreatedCredentials } from "@tt-digita/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { ApiError, createTeacher } from "@/lib/api";

export function CreateTeacherForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<CreatedCredentials | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await createTeacher({ name, email });
      setCredentials(created);
      setName("");
      setEmail("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível criar o professor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="space-y-3">
      <CardTitle className="text-base">Novo professor</CardTitle>
      <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
        <Input
          label="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="min-w-48 flex-1"
        />
        <Input
          label="E-mail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="min-w-48 flex-1"
        />
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Criando..." : "Criar"}
        </Button>
      </form>

      {error ? <p className="text-sm text-[var(--color-error)]">{error}</p> : null}

      {credentials ? (
        <div className="rounded-[var(--radius-card)] bg-[var(--color-success)]/10 p-3 text-sm">
          <p className="font-medium">Professor criado — anote agora, a senha não será mostrada de novo:</p>
          <p>
            E-mail: <span className="font-mono">{credentials.email}</span> · Senha temporária:{" "}
            <span className="font-mono">{credentials.temporaryPassword}</span>
          </p>
        </div>
      ) : null}
    </Card>
  );
}
