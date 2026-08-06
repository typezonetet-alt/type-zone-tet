"use client";

import Link from "next/link";
import type { AttemptResult, ExerciseDetail } from "@tt-digita/shared";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface ResultCardProps {
  result: AttemptResult;
  exercise: ExerciseDetail;
  onRetry: () => void;
}

export function ResultCard({ result, exercise, onRetry }: ResultCardProps) {
  const accuracyPct = Math.round(result.accuracy * 100);
  const minAccuracyPct = Math.round(exercise.minAccuracy * 100);

  return (
    <Card className="mx-auto max-w-lg space-y-6">
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <CardTitle>{result.passed ? "Exercício concluído!" : "Quase lá"}</CardTitle>
          <Badge variant={result.passed ? "success" : "error"}>
            {result.passed ? "Aprovado" : `Precisa de ${minAccuracyPct}%`}
          </Badge>
        </div>
        <CardDescription>{exercise.title}</CardDescription>
      </CardHeader>

      <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
        <Metric label="WPM líquido" value={result.wpmNet} />
        <Metric label="WPM bruto" value={result.wpmRaw} />
        <Metric label="Precisão" value={`${accuracyPct}%`} />
        <Metric label="Consistência" value={`${Math.round(result.consistency)}%`} />
      </div>

      {result.previousBest ? (
        <p className="text-center text-sm text-[var(--color-muted-foreground)]">
          Seu melhor anterior: {result.previousBest.wpmNet} WPM,{" "}
          {Math.round(result.previousBest.accuracy * 100)}% de precisão.
        </p>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="ghost" className="flex-1" onClick={onRetry}>
          Tentar de novo
        </Button>
        <Link href="/aprender" className={cn(buttonVariants({ variant: "primary" }), "flex-1")}>
          {result.passed ? "Próximo exercício" : "Voltar à trilha"}
        </Link>
      </div>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-[var(--color-muted-foreground)]">{label}</p>
    </div>
  );
}
