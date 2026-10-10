import { describe, expect, it } from 'vitest';
import { SEED_A } from '../testing/seeds.js';
import { fnv1aBytes, seedFromString } from './hash.js';
import { chance, pickUniform, pickWeighted, randFloat, randInt } from './random.js';
import { SequenceRng, U32_MAX } from './rng.js';
import { createSfc32 } from './sfc32.js';

const DRAWS = 100_000;

describe('randInt', () => {
  it('includes both bounds and stays uniform within one percent', () => {
    const rng = createSfc32(SEED_A);
    const counts = new Map<number, number>();
    for (let index = 0; index < DRAWS; index += 1) {
      const value = randInt(rng, 2, 5);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    expect([...counts.keys()].sort()).toEqual([2, 3, 4, 5]);
    for (const count of counts.values()) {
      expect(Math.abs(count / DRAWS - 0.25)).toBeLessThan(0.01);
    }
  });

  it('maps the lowest and highest stream values to the bounds', () => {
    expect(randInt(new SequenceRng([0]), 1, 6)).toBe(1);
    expect(randInt(new SequenceRng([U32_MAX]), 1, 6)).toBe(6);
  });

  it('rejects bounds that are not whole or are reversed', () => {
    const rng = createSfc32(SEED_A);
    expect(() => randInt(rng, 1.5, 3)).toThrow(RangeError);
    expect(() => randInt(rng, 3, 1)).toThrow(RangeError);
  });
});

describe('randFloat and chance', () => {
  it('draws floats inside [lo, hi)', () => {
    const rng = createSfc32(SEED_A);
    for (let index = 0; index < 1_000; index += 1) {
      const value = randFloat(rng, -0.05, 0.05);
      expect(value).toBeGreaterThanOrEqual(-0.05);
      expect(value).toBeLessThan(0.05);
    }
    expect(() => randFloat(rng, 1, 0)).toThrow(RangeError);
  });

  it('never passes a chance of 0 and always passes a chance of 1', () => {
    const rng = createSfc32(SEED_A);
    for (let index = 0; index < 1_000; index += 1) {
      expect(chance(rng, 0)).toBe(false);
      expect(chance(rng, 1)).toBe(true);
    }
    expect(() => chance(rng, 1.2)).toThrow(RangeError);
  });

  it('passes a chance at its rate', () => {
    const rng = createSfc32(SEED_A);
    let hits = 0;
    for (let index = 0; index < DRAWS; index += 1) {
      if (chance(rng, 0.2)) hits += 1;
    }
    expect(Math.abs(hits / DRAWS - 0.2)).toBeLessThan(0.005);
  });
});

describe('pickUniform and pickWeighted', () => {
  it('picks list elements and rejects an empty list', () => {
    const rng = createSfc32(SEED_A);
    expect(['a', 'b', 'c']).toContain(pickUniform(rng, ['a', 'b', 'c']));
    expect(() => pickUniform(rng, [])).toThrow(RangeError);
  });

  it('always picks the only weight above zero', () => {
    const rng = createSfc32(SEED_A);
    for (let index = 0; index < 1_000; index += 1) {
      expect(pickWeighted(rng, [0, 0, 1])).toBe(2);
    }
    expect(pickWeighted(new SequenceRng([U32_MAX]), [1, 1, 0])).toBe(1);
  });

  it('normalizes relative weights by their sum', () => {
    const rng = createSfc32(SEED_A);
    const counts = [0, 0];
    for (let index = 0; index < DRAWS; index += 1) {
      const picked = pickWeighted(rng, [30, 10]);
      counts[picked] = (counts[picked] ?? 0) + 1;
    }
    expect(Math.abs((counts[0] ?? 0) / DRAWS - 0.75)).toBeLessThan(0.01);
  });

  it('rejects zero-sum and negative weights', () => {
    const rng = createSfc32(SEED_A);
    expect(() => pickWeighted(rng, [0, 0])).toThrow(RangeError);
    expect(() => pickWeighted(rng, [])).toThrow(RangeError);
    expect(() => pickWeighted(rng, [1, -1])).toThrow(RangeError);
  });
});

describe('hashing', () => {
  it('hashes bytes with 32-bit FNV-1a', () => {
    expect(fnv1aBytes(new Uint8Array())).toBe(0x811c9dc5);
    expect(fnv1aBytes(Uint8Array.of(0x61))).toBe(0xe40c292c);
    expect(fnv1aBytes(Uint8Array.of(0x66, 0x6f, 0x6f, 0x62, 0x61, 0x72))).toBe(0xbf9cf968);
  });

  it('derives the same seed from the same text and different seeds from different texts', () => {
    expect(seedFromString('area_willowmere:1')).toBe(seedFromString('area_willowmere:1'));
    expect(seedFromString('area_willowmere:1')).not.toBe(seedFromString('area_willowmere:2'));
    expect(seedFromString('')).toBe(0x811c9dc5);
  });
});
