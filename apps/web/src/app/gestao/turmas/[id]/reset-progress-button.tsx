"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ApiError, resetStudentProgress } from "@/lib/api";

export function ResetProgressButton({ studentId, studentName }: { studentId: string; studentName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await resetStudentProgress(studentId);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível resetar o progresso.");
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--color-error)]">Apagar progresso de {studentName}?</span>
        <Button size="sm" variant="primary" onClick={handleConfirm} disabled={loading}>
          {loading ? "Apagando..." : "Confirmar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={loading}>
          Cancelar
        </Button>
        {error ? <span className="text-xs text-[var(--color-error)]">{error}</span> : null}
      </div>
    );
  }

  return (
    <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
      Resetar progresso
    </Button>
  );
}
