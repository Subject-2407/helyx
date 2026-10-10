import type { Clock } from '@helyx/shared';

/**
 * The production clock: wall-clock epoch milliseconds.
 *
 * The wall clock can step backwards (NTP corrections, manual changes). Game code relies on
 * time never going backwards, so this clock holds at the latest value it has reported until
 * the wall clock catches up again.
 */
export class SystemClock implements Clock {
  #latestMs = 0;

  constructor(private readonly readWallClock: () => number = Date.now) {}

  now(): number {
    const wallMs = Math.floor(this.readWallClock());
    if (wallMs > this.#latestMs) this.#latestMs = wallMs;
    return this.#latestMs;
  }
}
