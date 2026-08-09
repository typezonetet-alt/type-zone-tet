"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_TAGS = ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"];

// Mantido sempre no campo escondido pra sempre existir "algo" ali pra apagar
// -- sem isso, apertar Backspace num campo vazio nao dispara nenhum evento
// "input", e a gente nunca saberia que o aluno apertou Backspace.
const PLACEHOLDER = "​";

function fakeKeyboardEvent(key: string): KeyboardEvent {
  return { key, preventDefault: () => {} } as unknown as KeyboardEvent;
}

// Historico: essa hook comecou ouvindo "keydown" na window inteira (sem
// nenhum campo editavel focado) porque autoFocus + clique-para-focar num
// <input> de verdade nao era confiavel entre trocas de tela via React.
// Só que isso quebra acentos compostos por tecla morta (´ + o = "ó"), comuns
// em layouts de teclado ABNT2: sem um campo de texto de verdade recebendo o
// foco, o proprio sistema operacional nunca chega a compor o caractere
// final, e o "keydown" recebe as teclas cruas (ou nada) em vez do "ó" pronto.
//
// A solucao (o mesmo truque usado por editores/terminais na web, tipo
// xterm.js): manter um <input> de verdade, invisivel, sempre focado, e ouvir
// o evento nativo "input" dele em vez de "keydown" pro texto em si -- "input"
// so dispara depois que o SO ja terminou de compor a tecla morta, entao
// "data" ja vem com o caractere acentuado certo. "keydown" continua sendo
// usado so pra Escape, que nao produz nenhum "input".
export function useGlobalKeydown(
  handler: (event: KeyboardEvent) => void,
  enabled: boolean,
): void {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    if (!enabled) return;

    const input = document.createElement("input");
    input.setAttribute("aria-hidden", "true");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("autocorrect", "off");
    input.setAttribute("autocapitalize", "off");
    input.spellcheck = false;
    input.tabIndex = -1;
    Object.assign(input.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "1px",
      height: "1px",
      opacity: "0",
      padding: "0",
      border: "none",
      pointerEvents: "none",
    });
    document.body.appendChild(input);

    function resetInput() {
      input.value = PLACEHOLDER;
      input.setSelectionRange(PLACEHOLDER.length, PLACEHOLDER.length);
    }
    resetInput();
    input.focus();

    function onInput(event: Event) {
      const inputType = (event as InputEvent).inputType;

      if (inputType === "deleteContentBackward" || inputType === "deleteContentForward") {
        resetInput();
        handlerRef.current(fakeKeyboardEvent("Backspace"));
        return;
      }

      const inserted = (event as InputEvent).data ?? input.value.replace(PLACEHOLDER, "");
      resetInput();
      for (const char of inserted) {
        handlerRef.current(fakeKeyboardEvent(char));
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handlerRef.current(event);
      }
    }

    function refocusIfNothingElseClaimedFocus() {
      if (document.activeElement === document.body) {
        input.focus();
      }
    }

    function onBlur() {
      requestAnimationFrame(refocusIfNothingElseClaimedFocus);
    }

    function onWindowPointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement | null;
      if (target && FOCUSABLE_TAGS.includes(target.tagName)) return;
      input.focus();
    }

    input.addEventListener("input", onInput);
    input.addEventListener("keydown", onKeyDown);
    input.addEventListener("blur", onBlur);
    window.addEventListener("pointerdown", onWindowPointerDown);

    return () => {
      input.removeEventListener("input", onInput);
      input.removeEventListener("keydown", onKeyDown);
      input.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerdown", onWindowPointerDown);
      input.remove();
    };
  }, [enabled]);
}
