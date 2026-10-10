import { describe, expect, it } from 'vitest';
import { U32_MAX, unitFromU32, type Rng } from '../rng/rng.js';

const DRAWS = 1_000;

function draw<T>(count: number, sample: () => T): T[] {
  return Array.from({ length: count }, sample);
}

/**
 * The behavior every Rng implementation must share, so seeded generators and test doubles
 * are interchangeable wherever game logic takes an Rng.
 *
 * @param factory builds a fresh generator in the same starting state on every call
 *   (for a seeded generator: the same seed each time)
 */
export function describeRngContract(name: string, factory: () => Rng): void {
  describe(`${name} honors the Rng contract`, () => {
    it('returns unsigned 32-bit integers from nextU32', () => {
      const rng = factory();
      for (const value of draw(DRAWS, () => rng.nextU32())) {
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(U32_MAX);
      }
    });

    it('returns numbers in [0, 1) from next', () => {
      const rng = factory();
      for (const value of draw(DRAWS, () => rng.next())) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('derives next from exactly one nextU32 of the same stream', () => {
      const viaNext = factory();
      const viaU32 = factory();
      for (let index = 0; index < DRAWS; index += 1) {
        expect(viaNext.next()).toBe(unitFromU32(viaU32.nextU32()));
      }
    });

    it('stays in step when next and nextU32 calls are mixed', () => {
      const mixed = factory();
      const plain = factory();
      for (let index = 0; index < DRAWS; index += 1) {
        const expected = plain.nextU32();
        if (index % 2 === 0) {
          expect(mixed.nextU32()).toBe(expected);
        } else {
          expect(mixed.next()).toBe(unitFromU32(expected));
        }
      }
    });

    it('produces the same stream from two generators built the same way', () => {
      const first = factory();
      const second = factory();
      expect(draw(DRAWS, () => first.nextU32())).toEqual(draw(DRAWS, () => second.nextU32()));
    });
  });
}
