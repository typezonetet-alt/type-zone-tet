"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApiError, loginStaff, loginStudent } from "@/lib/api";

type LoginMode = "student" | "staff";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>("student");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "student") {
        await loginStudent({ code: identifier, password });
      } else {
        await loginStaff({ email: identifier, password });
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível entrar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function switchMode(next: LoginMode) {
    setMode(next);
    setIdentifier("");
    setPassword("");
    setError(null);
  }

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-[var(--color-primary)]">T&T Cursos</p>
          <h1 className="text-2xl font-semibold">T&T Digita</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Entrar</CardTitle>
            <CardDescription>
              {mode === "student"
                ? "Use o código e a senha fornecidos pelo seu professor."
                : "Entre com seu e-mail e senha de equipe (professor ou administrador)."}
            </CardDescription>
          </CardHeader>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-[var(--radius-card)] bg-[var(--color-muted)] p-1">
            <button
              type="button"
              onClick={() => switchMode("student")}
              className={`h-9 rounded-[calc(var(--radius-card)-4px)] text-sm font-medium transition-colors ${
                mode === "student"
                  ? "bg-[var(--color-card)] shadow-[var(--shadow-card)]"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              Aluno
            </button>
            <button
              type="button"
              onClick={() => switchMode("staff")}
              className={`h-9 rounded-[calc(var(--radius-card)-4px)] text-sm font-medium transition-colors ${
                mode === "staff"
                  ? "bg-[var(--color-card)] shadow-[var(--shadow-card)]"
                  : "text-[var(--color-muted-foreground)]"
              }`}
            >
              Equipe
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label={mode === "student" ? "Código" : "E-mail"}
              name={mode === "student" ? "code" : "email"}
              type={mode === "student" ? "text" : "email"}
              autoComplete={mode === "student" ? "username" : "email"}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <Input
              label="Senha"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {error ? (
              <p role="alert" className="text-sm text-[var(--color-error)]">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
