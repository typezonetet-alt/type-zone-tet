"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export function JoinRoomForm() {
  const router = useRouter();
  const [code, setCode] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/competir/${normalized}`);
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Código da sala"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCDE"
          className="text-center font-mono text-lg tracking-[0.3em] uppercase"
          maxLength={5}
          required
        />
        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>
    </Card>
  );
}
