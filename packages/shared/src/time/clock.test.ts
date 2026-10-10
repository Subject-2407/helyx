import { describe, expect, it } from 'vitest';
import { describeClockContract } from '../testing/clock-contract.js';
import { FakeClock } from './clock.js';

const START_MS = 1_700_000_000_000;

describeClockContract('FakeClock', () => new FakeClock(START_MS));

describe('FakeClock', () => {
  it('starts at the given time', () => {
    expect(new FakeClock(START_MS).now()).toBe(START_MS);
    expect(new FakeClock(0).now()).toBe(0);
  });

  it('advances by the given number of milliseconds', () => {
    const clock = new FakeClock(START_MS);
    clock.advance(50);
    expect(clock.now()).toBe(START_MS + 50);
    clock.advance(1_000);
    expect(clock.now()).toBe(START_MS + 1_050);
  });

  it('accepts a zero advance', () => {
    const clock = new FakeClock(START_MS);
    clock.advance(0);
    expect(clock.now()).toBe(START_MS);
  });

  it('sets an absolute time that is not in the past', () => {
    const clock = new FakeClock(START_MS);
    clock.set(START_MS + 30_000);
    expect(clock.now()).toBe(START_MS + 30_000);
    clock.set(START_MS + 30_000);
    expect(clock.now()).toBe(START_MS + 30_000);
  });

  it('rejects an invalid start time', () => {
    for (const bad of [
      -1,
      0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
    ]) {
      expect(() => new FakeClock(bad)).toThrow(RangeError);
    }
  });

  it('rejects negative, fractional and non-finite advances without changing the time', () => {
    const clock = new FakeClock(START_MS);
    for (const bad of [-1, 0.25, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => clock.advance(bad)).toThrow(RangeError);
    }
    expect(clock.now()).toBe(START_MS);
  });

  it('rejects an advance past the largest safe integer', () => {
    const clock = new FakeClock(Number.MAX_SAFE_INTEGER - 1);
    expect(() => clock.advance(2)).toThrow(RangeError);
    expect(clock.now()).toBe(Number.MAX_SAFE_INTEGER - 1);
  });

  it('rejects setting the time backwards or to an invalid value', () => {
    const clock = new FakeClock(START_MS);
    expect(() => clock.set(START_MS - 1)).toThrow(RangeError);
    for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, START_MS + 0.5]) {
      expect(() => clock.set(bad)).toThrow(RangeError);
    }
    expect(clock.now()).toBe(START_MS);
  });

  it('never goes backwards across a mix of advances and sets', () => {
    const clock = new FakeClock(START_MS);
    let previous = clock.now();
    for (const step of [50, 0, 50, 1_000, 7]) {
      clock.advance(step);
      expect(clock.now()).toBeGreaterThanOrEqual(previous);
      previous = clock.now();
      clock.set(previous + step);
      expect(clock.now()).toBeGreaterThanOrEqual(previous);
      previous = clock.now();
    }
  });
});
