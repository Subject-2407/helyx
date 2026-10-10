import { describeClockContract } from '@helyx/shared/testing';
import { describe, expect, it } from 'vitest';
import { SystemClock } from './clock.js';

describeClockContract('SystemClock', () => new SystemClock());

describe('SystemClock', () => {
  it('reports the wall clock', () => {
    expect(new SystemClock(() => 1_000).now()).toBe(1_000);
  });

  it('holds its latest value when the wall clock steps backwards', () => {
    const readings = [5_000, 4_000, 4_500, 6_000];
    const clock = new SystemClock(() => readings.shift() ?? 0);
    expect([clock.now(), clock.now(), clock.now(), clock.now()]).toEqual([
      5_000, 5_000, 5_000, 6_000,
    ]);
  });

  it('reports whole milliseconds', () => {
    expect(new SystemClock(() => 1_234.9).now()).toBe(1_234);
  });
});
