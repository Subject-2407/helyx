import { describe, expect, it } from 'vitest';
import type { Clock } from '../time/clock.js';

const READS = 1_000;

/**
 * The behavior every Clock implementation must share, so the fake used in tests and the
 * real one used in production are interchangeable.
 *
 * @param factory builds a fresh clock for each check
 */
export function describeClockContract(name: string, factory: () => Clock): void {
  describe(`${name} honors the Clock contract`, () => {
    it('reports time as a non-negative whole number of milliseconds', () => {
      const now = factory().now();
      expect(Number.isSafeInteger(now)).toBe(true);
      expect(now).toBeGreaterThanOrEqual(0);
    });

    it('never goes backwards between reads', () => {
      const clock = factory();
      let previous = clock.now();
      for (let read = 0; read < READS; read += 1) {
        const current = clock.now();
        expect(Number.isSafeInteger(current)).toBe(true);
        expect(current).toBeGreaterThanOrEqual(previous);
        previous = current;
      }
    });
  });
}
