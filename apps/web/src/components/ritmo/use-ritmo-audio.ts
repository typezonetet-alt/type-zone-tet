"use client";

import { useEffect, useRef } from "react";
import type { Judgement } from "./ritmo-config";

// Áudio do Modo Ritmo: clique + baixo de fundo disparados na MESMA virada de
// estado que já marca uma batida nova (`wordAppearedAtMs` muda uma vez por
// batida) -- em vez de um scheduler paralelo com seu próprio relógio. Isso
// importa aqui mais que em qualquer outro jogo do arcade: cada palavra tem
// uma janela de tempo DIFERENTE (proporcional ao tamanho dela, não mais um
// intervalo fixo -- ver beatWindowForWord em ritmo-config.ts), então um
// scheduler com tempo próprio dessincronizaria a cada palavra nova. Piggyback
// no próprio evento de mudança de batida garante sincronia perfeita sempre.
const MUSIC_LEVEL = 0.05;
const DUCK_LEVEL = 0.3;
const DUCK_RECOVER_SECONDS = 0.3;

// Baixo em lá menor, 4 notas -- ritmo, não melodia (não pode competir com os
// julgamentos, que são o que realmente importa ouvir).
const BASS_PATTERN_HZ = [110, 110, 146.83, 130.81];

export interface RitmoAudioInput {
  wordAppearedAtMs: number;
  /** Duração da batida ATUAL (ms) -- varia por palavra, não é mais fixo. */
  beatWindowMs: number;
  lastJudgement: Judgement | null;
  actionAt: number | null;
  missAt: number | null;
  combo: number;
  status: "ready" | "playing" | "gameover";
  soundOn: boolean;
  musicOn: boolean;
}

export function useRitmoAudio({
  wordAppearedAtMs,
  beatWindowMs,
  lastJudgement,
  actionAt,
  missAt,
  combo,
  status,
  soundOn,
  musicOn,
}: RitmoAudioInput): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const lastBeatRef = useRef<number | null>(null);
  const beatCountRef = useRef(0);
  const prev = useRef({ actionAt, missAt, combo, status });

  // 1) Ciclo de vida do AudioContext -- só nasce depois que a partida já
  //    começou (atrás de um gesto do usuário) e sobrevive até o "gameover":
  //    a última batida perdida (a que zera as vidas) acontece bem na
  //    transição, e se o contexto fechasse ali ela ficaria muda.
  const audioWanted = status !== "ready" && (soundOn || musicOn);
  useEffect(() => {
    if (!audioWanted) return;

    const ctx = new AudioContext();
    const musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(ctx.destination);
    ctxRef.current = ctx;
    musicGainRef.current = musicGain;
    lastBeatRef.current = null;
    beatCountRef.current = 0;

    return () => {
      ctxRef.current = null;
      musicGainRef.current = null;
      void ctx.close();
    };
  }, [audioWanted]);

  // 2) Clique + nota de baixo, uma vez por batida.
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    if (lastBeatRef.current === null) {
      lastBeatRef.current = wordAppearedAtMs;
      return;
    }
    if (lastBeatRef.current === wordAppearedAtMs) return;
    lastBeatRef.current = wordAppearedAtMs;
    const beatIndex = beatCountRef.current++;

    if (soundOn) playClick(ctx);
    const musicGain = musicGainRef.current;
    if (musicOn && musicGain) {
      musicGain.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 0.15);
      playBassNote(ctx, musicGain, BASS_PATTERN_HZ[beatIndex % BASS_PATTERN_HZ.length], beatWindowMs);
    }
  }, [wordAppearedAtMs, soundOn, musicOn, beatWindowMs]);

  // 3) Julgamento / erro / combo / fim de jogo -- observando as MUDANÇAS.
  useEffect(() => {
    const before = prev.current;
    prev.current = { actionAt, missAt, combo, status };

    const ctx = ctxRef.current;
    if (!ctx || !soundOn) return;
    // Não toca nada no primeiro quadro depois de o contexto nascer -- senão
    // sai um efeito solto ao entrar na tela.
    if (before.status === "ready") return;

    const duck = () => {
      const musicGain = musicGainRef.current;
      if (!musicGain || !musicOn) return;
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(MUSIC_LEVEL * DUCK_LEVEL, ctx.currentTime);
      musicGain.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime + 0.05, DUCK_RECOVER_SECONDS);
    };

    if (before.status === "playing" && status === "gameover") {
      playGameOver(ctx);
      return;
    }
    if (missAt !== before.missAt) {
      playMiss(ctx);
      duck();
      return;
    }
    if (actionAt !== before.actionAt && lastJudgement) {
      playJudgement(ctx, lastJudgement);
      duck();
      if (combo > 0 && combo % 8 === 0) playComboMilestone(ctx);
    }
  }, [actionAt, missAt, combo, lastJudgement, status, soundOn, musicOn]);
}

/** O tique do metrônomo: curto e agudo, corta por cima do baixo. */
function playClick(ctx: AudioContext): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 1046.5;
  gain.gain.setValueAtTime(0.13, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.045);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.05);
}

/** Nota de baixo sustentada -- dura quase a batida inteira (cadência varia). */
function playBassNote(ctx: AudioContext, destination: AudioNode, freq: number, beatWindowMs: number): void {
  const dur = Math.min(0.9, (beatWindowMs / 1000) * 0.85);
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(destination);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.02);
}

/**
 * Som do julgamento -- "noRitmo" (pousou no terço do meio da batida) soa
 * como uma recompensa limpa; "adiantado"/"apertado" soam mais secos, sem
 * punir (a palavra ainda contou), só avisando que o timing pode melhorar.
 */
function playJudgement(ctx: AudioContext, judgement: Judgement): void {
  if (judgement === "noRitmo") {
    [880, 1108.73].forEach((hz, i) => {
      const t = ctx.currentTime + i * 0.02;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(hz, t);
      gain.gain.setValueAtTime(0.13, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.17);
    });
    return;
  }

  const hz = judgement === "adiantado" ? 520 : 320;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0.1, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.1);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.11);
}

/** Batida perdida: buzz grave descendente. */
function playMiss(ctx: AudioContext): void {
  const dur = 0.28;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(220, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(90, ctx.currentTime + dur);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/** Marco de combo (a cada 8): arpejo rápido de 3 notas. */
function playComboMilestone(ctx: AudioContext): void {
  [660, 880, 1108.73].forEach((hz, i) => {
    const t = ctx.currentTime + i * 0.06;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0.08, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.13);
  });
}

/** Fim de jogo: três notas caindo. */
function playGameOver(ctx: AudioContext): void {
  [392, 329.63, 261.63].forEach((hz, i) => {
    const t = ctx.currentTime + i * 0.14;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
  });
}
