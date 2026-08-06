import { computeMetrics } from './metrics';

describe('computeMetrics', () => {
  it('computes wpmRaw/wpmNet from char counts over a duration', () => {
    const result = computeMetrics({
      durationMs: 60_000,
      typedChars: 250,
      correctChars: 200,
      incorrectChars: 50,
      charsPerSecondBuckets: [],
    });

    expect(result.wpmRaw).toBeCloseTo(50, 5);
    expect(result.wpmNet).toBeCloseTo(40, 5);
  });

  it('returns 100% accuracy when nothing relevant was typed', () => {
    const result = computeMetrics({
      durationMs: 10_000,
      typedChars: 0,
      correctChars: 0,
      incorrectChars: 0,
      charsPerSecondBuckets: [],
    });

    expect(result.accuracy).toBe(1);
  });

  it('computes accuracy as correct / (correct + incorrect)', () => {
    const result = computeMetrics({
      durationMs: 10_000,
      typedChars: 100,
      correctChars: 90,
      incorrectChars: 10,
      charsPerSecondBuckets: [],
    });

    expect(result.accuracy).toBeCloseTo(0.9, 4);
  });

  it('returns wpm 0 when duration is not positive instead of dividing by zero', () => {
    const result = computeMetrics({
      durationMs: 0,
      typedChars: 50,
      correctChars: 50,
      incorrectChars: 0,
      charsPerSecondBuckets: [],
    });

    expect(result.wpmRaw).toBe(0);
    expect(result.wpmNet).toBe(0);
  });

  it('gives consistency 100 for a perfectly steady rhythm', () => {
    const result = computeMetrics({
      durationMs: 10_000,
      typedChars: 40,
      correctChars: 40,
      incorrectChars: 0,
      charsPerSecondBuckets: [4, 4, 4, 4, 4],
    });

    expect(result.consistency).toBe(100);
  });

  it('gives a lower consistency score for an erratic rhythm', () => {
    const result = computeMetrics({
      durationMs: 10_000,
      typedChars: 40,
      correctChars: 40,
      incorrectChars: 0,
      charsPerSecondBuckets: [10, 0, 10, 0, 10],
    });

    expect(result.consistency).toBeLessThan(50);
  });

  it('defaults consistency to 100 with fewer than two buckets', () => {
    const result = computeMetrics({
      durationMs: 5_000,
      typedChars: 20,
      correctChars: 20,
      incorrectChars: 0,
      charsPerSecondBuckets: [4],
    });

    expect(result.consistency).toBe(100);
  });
});
