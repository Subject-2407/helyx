import { describe, expect, it } from 'vitest';
import { assertFraction, assertInRange, assertNonNegative, assertWhole } from './guards.js';
import { clamp, floorTo, mean, roundTo, sum } from './math.js';

describe('balance math helpers', () => {
  it('clamps into a range', () => {
    expect(clamp(-2, -1, 1)).toBe(-1);
    expect(clamp(0.3, -1, 1)).toBe(0.3);
    expect(clamp(1.15, -1, 1)).toBe(1);
  });

  it('rounds to a number of decimals', () => {
    expect(roundTo(25.79, 1)).toBe(25.8);
    expect(roundTo(0.0060025, 6)).toBe(0.006003);
    expect(roundTo(12.5, 0)).toBe(13);
  });

  it('floors to a number of decimals without float noise', () => {
    expect(floorTo(0.0060025, 6)).toBe(0.006002);
    expect(floorTo(3.4567891, 2)).toBe(3.45);
    expect(floorTo(0.29, 2)).toBe(0.29);
    expect(floorTo(0.57, 2)).toBe(0.57);
  });

  it('sums and averages lists', () => {
    expect(sum([1, 2, 3.5])).toBe(6.5);
    expect(sum([])).toBe(0);
    expect(mean([0.3, 0])).toBe(0.15);
    expect(mean([])).toBe(0);
  });
});

describe('balance argument guards', () => {
  it('accepts values inside their domain', () => {
    expect(() => assertInRange(0.5, 0, 1, 'x')).not.toThrow();
    expect(() => assertNonNegative(0, 'x')).not.toThrow();
    expect(() => assertWhole(3, 1, 'x')).not.toThrow();
    expect(() => assertFraction(1, 'x')).not.toThrow();
  });

  it('rejects values outside their domain with a range error', () => {
    expect(() => assertInRange(1.5, 0, 1, 'x')).toThrow(RangeError);
    expect(() => assertInRange(Number.NaN, 0, 1, 'x')).toThrow(RangeError);
    expect(() => assertNonNegative(-1, 'x')).toThrow(RangeError);
    expect(() => assertNonNegative(Number.POSITIVE_INFINITY, 'x')).toThrow(RangeError);
    expect(() => assertWhole(2.5, 1, 'x')).toThrow(RangeError);
    expect(() => assertWhole(0, 1, 'x')).toThrow(RangeError);
    expect(() => assertFraction(-0.1, 'x')).toThrow(/x must be between 0 and 1/);
  });
});
