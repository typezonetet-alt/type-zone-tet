"use client";

import { useEffect, useRef } from "react";

// Mesmo padrão do áudio do Modo Ritmo (components/ritmo/use-ritmo-audio.ts):
// sons gerados via Web Audio, sem nenhum arquivo pra baixar (leveza, conforme
// o briefing), e o AudioContext só nasce depois que o jogo já está rodando --
// ou seja, sempre atrás de um gesto do usuário (clicar em "Jogar"), porque
// navegadores bloqueiam áudio iniciado sem interação.
//
// O "corte" é ruído filtrado descendo de frequência (um "swoosh" de lâmina);
// a bomba é um tom grave em queda (o clássico "boom" descendente). São
// disparados observando as CONTAGENS (fruitsSliced/bombsHit) em vez de ouvir
// o array de efeitos -- mais simples e já é exatamente um por acontecimento.
export function useSaladaSound(fruitsSliced: number, bombsHit: number, enabled: boolean): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const lastSlicedRef = useRef<number | null>(null);
  const lastBombRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      lastSlicedRef.current = null;
      lastBombRef.current = null;
      return;
    }

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;
    if (ctx.state === "suspended") void ctx.resume();

    // Não toca nada no primeiro render depois de habilitar -- só nas
    // mudanças seguintes, senão soa um efeito solto ao abrir a tela.
    if (lastSlicedRef.current === null) {
      lastSlicedRef.current = fruitsSliced;
      lastBombRef.current = bombsHit;
      return;
    }

    if (fruitsSliced !== lastSlicedRef.current) {
      lastSlicedRef.current = fruitsSliced;
      playSlice(ctx);
    }
    if (bombsHit !== lastBombRef.current) {
      lastBombRef.current = bombsHit;
      playBoom(ctx);
    }
  }, [fruitsSliced, bombsHit, enabled]);

  useEffect(() => {
    return () => {
      void ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);
}

function playSlice(ctx: AudioContext): void {
  const durationSec = 0.16;
  const bufferSize = Math.floor(ctx.sampleRate * durationSec);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2400, ctx.currentTime);
  filter.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + durationSec);
  filter.Q.value = 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.28, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);

  noise.connect(filter).connect(gain).connect(ctx.destination);
  noise.start();
  noise.stop(ctx.currentTime + durationSec);
}

function playBoom(ctx: AudioContext): void {
  const durationSec = 0.35;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + durationSec);
  gain.gain.setValueAtTime(0.32, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durationSec);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + durationSec);
}
