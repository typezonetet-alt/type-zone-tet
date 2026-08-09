import {
  computeMastery,
  meetsMasteryBar,
  meetsUnlockBar,
  type MasteryAttempt,
} from './mastery';

const EXERCISE = { minAccuracy: 0.9, targetWpm: 20, minAttempts: 2 };

function attempt(overrides: Partial<MasteryAttempt> = {}): MasteryAttempt {
  return { accuracy: 0.95, wpmNet: 25, consistency: 0.9, ...overrides };
}

describe('computeMastery', () => {
  it('is "none" with no attempts at all', () => {
    expect(computeMastery(EXERCISE, [])).toBe('none');
  });

  it('is "bronze" after a single passing attempt when minAttempts requires more', () => {
    expect(computeMastery(EXERCISE, [attempt()])).toBe('bronze');
  });

  it('does not jump to "prata" on one lucky attempt -- this is the fix for the one-and-done bug', () => {
    const oneGreatAttempt = [attempt({ accuracy: 0.99, wpmNet: 40 })];
    expect(computeMastery(EXERCISE, oneGreatAttempt)).toBe('bronze');
  });

  it('is "bronze" when enough attempts exist but the recent ones fail accuracy', () => {
    const attempts = [attempt({ accuracy: 0.5 }), attempt({ accuracy: 0.6 })];
    expect(computeMastery(EXERCISE, attempts)).toBe('bronze');
  });

  it('is "prata" once the last minAttempts attempts all clear minAccuracy but miss targetWpm', () => {
    const attempts = [attempt({ wpmNet: 10 }), attempt({ wpmNet: 12 })];
    expect(computeMastery(EXERCISE, attempts)).toBe('prata');
  });

  it('only looks at the most recent window -- an old failure does not block prata once the streak recovers', () => {
    const attempts = [
      attempt({ accuracy: 0.4, wpmNet: 5 }),
      attempt({ wpmNet: 10 }),
      attempt({ wpmNet: 12 }),
    ];
    expect(computeMastery(EXERCISE, attempts)).toBe('prata');
  });

  it('is "ouro" once the recent streak clears both accuracy and targetWpm', () => {
    const attempts = [attempt({ wpmNet: 22 }), attempt({ wpmNet: 24 })];
    expect(computeMastery(EXERCISE, attempts)).toBe('ouro');
  });

  it('is "ouro", not "prata", when there is no targetWpm to miss', () => {
    const noSpeedGoal = { ...EXERCISE, targetWpm: null };
    const attempts = [attempt({ wpmNet: 5 }), attempt({ wpmNet: 6 })];
    expect(computeMastery(noSpeedGoal, attempts)).toBe('ouro');
  });

  it('is "diamante" when the recent streak clears accuracy+bonus, wpm*1.3 and consistency', () => {
    const attempts = [
      attempt({ accuracy: 0.99, wpmNet: 30, consistency: 0.9 }),
      attempt({ accuracy: 0.98, wpmNet: 32, consistency: 0.85 }),
    ];
    expect(computeMastery(EXERCISE, attempts)).toBe('diamante');
  });

  it('stays "ouro" when accuracy/wpm are diamond-level but consistency is not', () => {
    const attempts = [
      attempt({ accuracy: 0.99, wpmNet: 30, consistency: 0.5 }),
      attempt({ accuracy: 0.98, wpmNet: 32, consistency: 0.4 }),
    ];
    expect(computeMastery(EXERCISE, attempts)).toBe('ouro');
  });

  it('requires ALL attempts in the recent window to qualify, not just one', () => {
    const attempts = [attempt({ wpmNet: 5 }), attempt({ wpmNet: 25 })];
    // so a mais recente bate targetWpm=20 -- a anterior (5) nao. Como a janela
    // e das ultimas 2, isso ainda falha em wpm -> prata, nao ouro.
    expect(computeMastery(EXERCISE, attempts)).toBe('prata');
  });
});

describe('meetsMasteryBar', () => {
  it('is false for none and bronze', () => {
    expect(meetsMasteryBar('none')).toBe(false);
    expect(meetsMasteryBar('bronze')).toBe(false);
  });

  it('is true for prata, ouro and diamante', () => {
    expect(meetsMasteryBar('prata')).toBe(true);
    expect(meetsMasteryBar('ouro')).toBe(true);
    expect(meetsMasteryBar('diamante')).toBe(true);
  });
});

// meetsUnlockBar é deliberadamente MAIS FÁCIL que meetsMasteryBar: avançar
// pro próximo exercício não deveria exigir a mesma sequência que ganhar o
// medalhão. Ver o comentário da função em mastery.ts pro histórico dos dois
// bugs (em direções opostas) que motivaram essa separação.
describe('meetsUnlockBar', () => {
  it('is false with no attempts at all (bestAccuracy null)', () => {
    expect(meetsUnlockBar(0.75, null)).toBe(false);
  });

  it('is true the moment the BEST attempt ever clears minAccuracy -- no streak required', () => {
    // Cenário exato do bug relatado: uma única tentativa boa, sem repetir.
    expect(meetsUnlockBar(0.75, 0.8)).toBe(true);
  });

  it('is false when the best attempt ever still falls short of minAccuracy', () => {
    expect(meetsUnlockBar(0.75, 0.6)).toBe(false);
  });

  it('is true exactly at the boundary (bestAccuracy === minAccuracy)', () => {
    expect(meetsUnlockBar(0.75, 0.75)).toBe(true);
  });

  it('uses the DEFAULT threshold (0.75) when the teacher has not customized minAccuracy', () => {
    // O default do schema (Exercise.minAccuracy) é 0.75 -- este teste apenas
    // documenta a intenção; o valor de verdade é responsabilidade do schema.
    const DEFAULT_MIN_ACCURACY = 0.75;
    expect(meetsUnlockBar(DEFAULT_MIN_ACCURACY, 0.76)).toBe(true);
    expect(meetsUnlockBar(DEFAULT_MIN_ACCURACY, 0.74)).toBe(false);
  });
});
