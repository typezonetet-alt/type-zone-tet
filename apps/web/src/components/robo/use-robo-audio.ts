"use client";

import { useEffect, useRef } from "react";

// Áudio do T&T Robô: efeitos + trilha, num hook só.
//
// Por que juntos (e não dois hooks como na Salada): aqui a trilha ABAIXA
// sozinha quando um efeito toca ("ducking", o mesmo truque de rádio/podcast).
// Pra isso o efeito precisa mexer no ganho da música, então os dois têm que
// dividir o mesmo AudioContext e o mesmo nó de ganho -- separá-los exigiria
// passar nós de áudio entre hooks, o que é pior de manter.
//
// Tudo é gerado por oscilador (nenhum arquivo pra baixar), seguindo a mesma
// linha de leveza do resto do projeto.

const BPM = 148;
const STEP_SECONDS = 60 / BPM / 2; // colcheia
const LOOKAHEAD_SECONDS = 0.15;
const SCHEDULER_INTERVAL_MS = 50;

/** Volume de repouso da trilha -- bem abaixo dos efeitos, de propósito. */
const MUSIC_LEVEL = 0.055;
/** Quanto a trilha cai quando um efeito toca (fração do volume normal). */
const DUCK_LEVEL = 0.3;
const DUCK_RECOVER_SECONDS = 0.35;

// Baixo corrido em lá menor -- ritmo de corrida, sem melodia competindo
// com os efeitos.
const BASS_HZ = [110, 110, 164.81, 110, 130.81, 110, 146.83, 123.47];

export interface RoboAudioInput {
  jumpStartedAt: number | null;
  score: number;
  lives: number;
  stage: number;
  status: "ready" | "playing" | "gameover";
  soundOn: boolean;
  musicOn: boolean;
}

export function useRoboAudio({
  jumpStartedAt,
  score,
  lives,
  stage,
  status,
  soundOn,
  musicOn,
}: RoboAudioInput): void {
  const ctxRef = useRef<AudioContext | null>(null);
  const musicGainRef = useRef<GainNode | null>(null);
  const prev = useRef({ jumpStartedAt, score, lives, stage, started: false });
  const playing = status === "playing";

  // 1) Ciclo de vida do AudioContext. Só nasce depois que a partida começou
  //    -- ou seja, sempre atrás de um gesto do usuário (clicar em "Jogar"),
  //    porque navegadores bloqueiam áudio iniciado sem interação.
  //
  // Continua vivo no "gameover" de propósito: a batida que tira a ÚLTIMA
  // vida acontece exatamente na transição pra gameover, e se o contexto
  // fosse fechado aí, justamente a colisão mais importante seria muda.
  const audioWanted = status !== "ready" && (soundOn || musicOn);
  useEffect(() => {
    if (!audioWanted) return;

    const ctx = new AudioContext();
    const musicGain = ctx.createGain();
    musicGain.gain.value = 0;
    musicGain.connect(ctx.destination);
    ctxRef.current = ctx;
    musicGainRef.current = musicGain;

    return () => {
      ctxRef.current = null;
      musicGainRef.current = null;
      void ctx.close();
    };
  }, [audioWanted]);

  // 2) Trilha em loop, agendada pelo relógio do próprio AudioContext
  //    (ctx.currentTime) e não por setInterval -- setInterval desvia sob
  //    carga e a batida ficaria capenga depois de alguns segundos.
  useEffect(() => {
    if (!ctxRef.current || !musicGainRef.current || !musicOn || !playing) return;
    // Vinculados a consts já tipados: dentro das closures do agendador o
    // TypeScript não mantém o estreitamento feito no guard acima.
    const ctx: AudioContext = ctxRef.current;
    const musicGain: GainNode = musicGainRef.current;

    musicGain.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime, 0.2);

    let step = 0;
    let nextNoteTime = ctx.currentTime + 0.1;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function scheduleStep(time: number) {
      // baixo
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(BASS_HZ[step % BASS_HZ.length], time);
      g.gain.setValueAtTime(0.0001, time);
      g.gain.exponentialRampToValueAtTime(1, time + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, time + STEP_SECONDS * 0.9);
      osc.connect(g).connect(musicGain);
      osc.start(time);
      osc.stop(time + STEP_SECONDS);

      // chimbal seco nas colcheias ímpares -- dá a sensação de passada
      if (step % 2 === 1) {
        const noise = ctx.createBufferSource();
        const len = Math.floor(ctx.sampleRate * 0.03);
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
        noise.buffer = buf;
        const hp = ctx.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.value = 6000;
        const hg = ctx.createGain();
        hg.gain.value = 0.5;
        noise.connect(hp).connect(hg).connect(musicGain);
        noise.start(time);
      }
      step += 1;
    }

    function loop() {
      while (nextNoteTime < ctx.currentTime + LOOKAHEAD_SECONDS) {
        scheduleStep(nextNoteTime);
        nextNoteTime += STEP_SECONDS;
      }
      timer = setTimeout(loop, SCHEDULER_INTERVAL_MS);
    }
    loop();

    return () => {
      if (timer) clearTimeout(timer);
      musicGain.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
    };
  }, [musicOn, playing, audioWanted]);

  // 3) Efeitos, disparados observando as MUDANÇAS de estado do jogo.
  useEffect(() => {
    const before = prev.current;
    prev.current = { jumpStartedAt, score, lives, stage, started: playing };

    const ctx = ctxRef.current;
    if (!ctx || !soundOn) return;
    // Exige que a partida já estivesse rolando no quadro ANTERIOR (e não
    // agora): não toca nada no primeiro quadro depois de começar -- senão
    // sai um efeito solto ao entrar na partida -- e ainda assim deixa passar
    // a colisão que encerra o jogo, que acontece na saída do "playing".
    if (!before.started) return;

    const duck = () => {
      const musicGain = musicGainRef.current;
      if (!musicGain || !musicOn) return;
      musicGain.gain.cancelScheduledValues(ctx.currentTime);
      musicGain.gain.setValueAtTime(MUSIC_LEVEL * DUCK_LEVEL, ctx.currentTime);
      musicGain.gain.setTargetAtTime(MUSIC_LEVEL, ctx.currentTime + 0.08, DUCK_RECOVER_SECONDS);
    };

    // Bateu num obstáculo -- tem prioridade sobre qualquer outro efeito.
    if (lives < before.lives) {
      playCrash(ctx);
      duck();
      return;
    }
    // Subiu de fase.
    if (stage > before.stage) {
      playStageUp(ctx);
      duck();
      return;
    }
    // Passou por cima do obstáculo (o placar só sobe nesse caso).
    if (score > before.score) {
      playClear(ctx);
      duck();
      return;
    }
    // Saiu do chão.
    if (before.jumpStartedAt === null && jumpStartedAt !== null) {
      playJump(ctx);
      duck();
      return;
    }
    // Aterrissou.
    if (before.jumpStartedAt !== null && jumpStartedAt === null) {
      playLand(ctx);
    }
  }, [jumpStartedAt, score, lives, stage, playing, soundOn, musicOn]);
}

/** Pulo: tom curto subindo -- o clássico "boing" de plataforma. */
function playJump(ctx: AudioContext): void {
  const dur = 0.18;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "square";
  osc.frequency.setValueAtTime(280, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(720, ctx.currentTime + dur);
  gain.gain.setValueAtTime(0.16, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/** Aterrissagem: baque grave e curtinho. */
function playLand(ctx: AudioContext): void {
  const dur = 0.12;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + dur);
  gain.gain.setValueAtTime(0.12, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/** Obstáculo vencido: dois bipes ascendentes, som de "ponto". */
function playClear(ctx: AudioContext): void {
  [
    [660, 0],
    [990, 0.07],
  ].forEach(([hz, delay]) => {
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0.14, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.12);
  });
}

/** Batida: ruído áspero + tom grave caindo. */
function playCrash(ctx: AudioContext): void {
  const dur = 0.34;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1800, ctx.currentTime);
  lp.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + dur);
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.3, ctx.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  noise.connect(lp).connect(ng).connect(ctx.destination);
  noise.start();

  const osc = ctx.createOscillator();
  const og = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(160, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + dur);
  og.gain.setValueAtTime(0.22, ctx.currentTime);
  og.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(og).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur);
}

/** Fase nova: arpejo curto de vitória. */
function playStageUp(ctx: AudioContext): void {
  [523.25, 659.25, 783.99, 1046.5].forEach((hz, i) => {
    const t = ctx.currentTime + i * 0.09;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(hz, t);
    gain.gain.setValueAtTime(0.16, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.24);
  });
}
