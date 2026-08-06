"use client";

import { useEffect } from "react";

// Escuta teclado na janela inteira em vez de depender de foco de um elemento
// especifico. autoFocus + clique-para-focar nao e confiavel em todo navegador
// (o foco pode nao "pegar" depois que uma troca de tela via React acontece
// logo apos um clique em botao) -- ouvir a janela e a abordagem robusta usada
// por sites de teste de digitacao, e funciona porque essas telas nao tem
// nenhum <input>/<textarea> de verdade disputando o teclado.
export function useGlobalKeydown(
  handler: (event: KeyboardEvent) => void,
  enabled: boolean,
): void {
  useEffect(() => {
    if (!enabled) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        return;
      }
      handler(event);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handler, enabled]);
}
