import { describe, expect, it } from 'vitest';
import { describeRngContract } from '../testing/rng-contract.js';
import { isU32, SequenceRng, U32_MAX, U32_SPAN, unitFromU32 } from './rng.js';

const SEQUENCE = [0, 1, 0x8000_0000, U32_MAX, 123_456_789];

describeRngContract('SequenceRng', () => new SequenceRng(SEQUENCE));
describeRngContract('SequenceRng with a single value', () => new SequenceRng([U32_MAX]));

describe('u32 helpers', () => {
  it('spans exactly the unsigned 32-bit range', () => {
    expect(U32_MAX).toBe(4_294_967_295);
    expect(U32_SPAN).toBe(4_294_967_296);
  });

  it('recognizes unsigned 32-bit integers', () => {
    expect(isU32(0)).toBe(true);
    expect(isU32(U32_MAX)).toBe(true);
    for (const bad of [-1, U32_SPAN, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(isU32(bad)).toBe(false);
    }
  });

  it('maps u32 values onto [0, 1)', () => {
    expect(unitFromU32(0)).toBe(0);
    expect(unitFromU32(0x8000_0000)).toBe(0.5);
    expect(unitFromU32(U32_MAX)).toBeLessThan(1);
    expect(unitFromU32(U32_MAX)).toBe(U32_MAX / U32_SPAN);
  });
});

describe('SequenceRng', () => {
  it('replays its values in order and cycles back to the start', () => {
    const rng = new SequenceRng(SEQUENCE);
    const twice = Array.from({ length: SEQUENCE.length * 2 }, () => rng.nextU32());
    expect(twice).toEqual([...SEQUENCE, ...SEQUENCE]);
  });

  it('scales the same values into [0, 1) through next', () => {
    const rng = new SequenceRng(SEQUENCE);
    const values = Array.from({ length: SEQUENCE.length }, () => rng.next());
    expect(values).toEqual(SEQUENCE.map(unitFromU32));
    expect(values[0]).toBe(0);
    expect(values[2]).toBe(0.5);
    for (const value of values) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('gives identical sequences for two instances built the same way', () => {
    const first = new SequenceRng(SEQUENCE);
    const second = new SequenceRng(SEQUENCE);
    for (let index = 0; index < SEQUENCE.length * 3; index += 1) {
      expect(first.nextU32()).toBe(second.nextU32());
      expect(first.next()).toBe(second.next());
    }
  });

  it('is not affected by later changes to the input list', () => {
    const values = [1, 2, 3];
    const rng = new SequenceRng(values);
    values[0] = 99;
    expect(rng.nextU32()).toBe(1);
  });

  it('rejects an empty list', () => {
    expect(() => new SequenceRng([])).toThrow(RangeError);
  });

  it('rejects values outside the unsigned 32-bit range', () => {
    for (const bad of [-1, U32_SPAN, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => new SequenceRng([0, bad])).toThrow(RangeError);
    }
  });
});
