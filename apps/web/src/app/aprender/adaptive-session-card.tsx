import Link from "next/link";
import { AdaptiveBlock, type AdaptiveSessionItem } from "@tt-digita/shared";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge, type BadgeProps } from "@/components/ui/badge";

const BLOCK_LABEL: Record<AdaptiveBlock, string> = {
  [AdaptiveBlock.REVISAO]: "Revisão",
  [AdaptiveBlock.FRAQUEZA]: "Ponto fraco",
  [AdaptiveBlock.ATUAL]: "Seu nível",
  [AdaptiveBlock.DESAFIO]: "Desafio",
};

const BLOCK_VARIANT: Record<AdaptiveBlock, BadgeProps["variant"]> = {
  [AdaptiveBlock.REVISAO]: "muted",
  [AdaptiveBlock.FRAQUEZA]: "error",
  [AdaptiveBlock.ATUAL]: "primary",
  [AdaptiveBlock.DESAFIO]: "accent",
};

export function AdaptiveSessionCard({ items }: { items: AdaptiveSessionItem[] }) {
  if (items.length === 0) return null;

  return (
    <Card className="space-y-3">
      <div>
        <CardTitle className="text-base">Sessão de hoje</CardTitle>
        <CardDescription>
          Uma mistura pensada pra reforçar o que você já sabe, atacar pontos fracos e te levar
          um pouco além.
        </CardDescription>
      </div>
      <ol className="space-y-2">
        {items.map((item, index) => {
          const row = (
            <div
              className={
                "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors " +
                (item.unlocked
                  ? "border-[var(--color-border)] hover:border-[var(--color-primary)]"
                  : "border-dashed border-[var(--color-border)] opacity-60")
              }
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-[var(--color-muted-foreground)]">{index + 1}.</span>
                <span className="text-sm font-medium">{item.title}</span>
                {!item.unlocked ? <span aria-hidden="true">🔒</span> : null}
              </div>
              <Badge variant={BLOCK_VARIANT[item.block]}>{BLOCK_LABEL[item.block]}</Badge>
            </div>
          );

          return (
            <li key={`${item.block}-${item.id}`}>
              {item.unlocked ? <Link href={`/aprender/${item.id}`}>{row}</Link> : row}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
