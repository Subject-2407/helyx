import { describe, expect, it } from 'vitest';
import { describeRngContract } from '../testing/rng-contract.js';
import { SEED_A, SEED_B } from '../testing/seeds.js';
import golden from './__golden__/sfc32.json' with { type: 'json' };
import { createSfc32 } from './sfc32.js';

describeRngContract('sfc32', () => createSfc32(SEED_A));

function firstValues(seed: number, count: number): number[] {
  const rng = createSfc32(seed);
  return Array.from({ length: count }, () => rng.nextU32());
}

describe('sfc32', () => {
  it('produces the recorded stream for the default seed', () => {
    expect(firstValues(SEED_A, golden.seedA.firstTen.length)).toEqual(golden.seedA.firstTen);
  });

  it('produces unrelated streams for neighbouring seeds', () => {
    const base = firstValues(SEED_A, 8);
    const next = firstValues(SEED_A + 1, 8);
    const other = firstValues(SEED_B, 8);
    for (let index = 0; index < base.length; index += 1) {
      expect(next[index]).not.toBe(base[index]);
      expect(other[index]).not.toBe(base[index]);
    }
  });

  it('treats a seed modulo 2^32', () => {
    expect(firstValues(SEED_A + 2 ** 32, 4)).toEqual(firstValues(SEED_A, 4));
  });

  it('spreads values evenly over [0, 1)', () => {
    const rng = createSfc32(SEED_A);
    const buckets = new Array<number>(10).fill(0);
    const draws = 100_000;
    for (let index = 0; index < draws; index += 1) {
      const bucket = Math.floor(rng.next() * buckets.length);
      buckets[bucket] = (buckets[bucket] ?? 0) + 1;
    }
    for (const count of buckets) {
      expect(Math.abs(count / draws - 0.1)).toBeLessThan(0.005);
    }
  });
});
