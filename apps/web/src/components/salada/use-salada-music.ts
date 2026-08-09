"use client";

import { useEffect, useRef } from "react";

// Trilha de fundo "eletrizante" pra dar clima de arcade -- mas de propósito
// BEM baixa (ganho máximo 0.05, contra 0.28 do corte e 0.32 da bomba em
// use-salada-sound.ts): o som de corte/explosão tem que continuar sendo o
// que se ouve primeiro, a música é só ambientação.
//
// O agendamento usa o relógio do próprio AudioContext (ctx.currentTime), não
// setInterval do JS -- setInterval desvia (o event loop atrasa sob carga) e
// a batida ficaria capenga depois de alguns segundos.
const BPM = 132;
const STEP_SECONDS = 60 / BPM / 2; // colcheia
const LOOKAHEAD_SECONDS = 0.15;
const SCHEDULER_INTERVAL_MS = 50;

// Riff curto e grave (Hz), em loop -- padrão simples de baixo synth-pop.
const RIFF_HZ = [110, 110, 146.83, 110, 130.81, 110, 98, 110];

export function useSaladaMusic(enabled: boolean): void {
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const ctx = new AudioContext();
    ctxRef.current = ctx;
    let step = 0;
    let nextNoteTime = ctx.currentTime + 0.1;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleNote(time: number) {
      const freq = RIFF_HZ[step % RIFF_HZ.length];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(0.05, time + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + STEP_SECONDS * 0.85);
      osc.connect(gain).connect(ctx.destination);
      osc.start(time);
      osc.stop(time + STEP_SECONDS);
      step += 1;
    }

    function loop() {
      while (nextNoteTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
        scheduleNote(nextNoteTime);
        nextNoteTime += STEP_SECONDS;
      }
      timer = setTimeout(loop, SCHEDULER_INTERVAL_MS);
    }
    loop();

    return () => {
      if (timer) clearTimeout(timer);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [enabled]);
}
