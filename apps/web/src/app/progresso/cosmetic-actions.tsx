"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { CosmeticView } from "@tt-digita/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApiError, equipCosmetic, purchaseCosmetic } from "@/lib/api";

export function CosmeticActions({
  cosmetic,
  studentLevel,
  studentCoins,
}: {
  cosmetic: CosmeticView;
  studentLevel: number;
  studentCoins: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    try {
      await purchaseCosmetic(cosmetic.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível comprar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEquip() {
    setLoading(true);
    setError(null);
    try {
      await equipCosmetic(cosmetic.id);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível equipar.");
    } finally {
      setLoading(false);
    }
  }

  if (cosmetic.equipped) {
    return <Badge variant="success">Equipado</Badge>;
  }

  if (cosmetic.owned) {
    return (
      <div className="space-y-1">
        <Button size="sm" variant="secondary" onClick={handleEquip} disabled={loading}>
          {loading ? "Equipando..." : "Equipar"}
        </Button>
        {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
      </div>
    );
  }

  const levelLocked = studentLevel < cosmetic.requiredLevel;
  const coinsLocked = !levelLocked && studentCoins < cosmetic.cost;

  return (
    <div className="space-y-1">
      <Button
        size="sm"
        variant="primary"
        onClick={handlePurchase}
        disabled={loading || levelLocked || coinsLocked}
      >
        {loading ? "Comprando..." : cosmetic.cost === 0 ? "Desbloquear" : `Comprar · ${cosmetic.cost} moedas`}
      </Button>
      {levelLocked ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Requer nível {cosmetic.requiredLevel}
        </p>
      ) : coinsLocked ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">Moedas insuficientes</p>
      ) : null}
      {error ? <p className="text-xs text-[var(--color-error)]">{error}</p> : null}
    </div>
  );
}
