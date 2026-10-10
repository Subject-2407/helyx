/**
 * The source of "now" for game logic. Shared code never reads the wall clock directly;
 * it receives a Clock so tests can control time and simulations stay deterministic.
 *
 * Contract: `now()` returns epoch milliseconds as a non-negative safe integer, and
 * successive calls never return a smaller value than an earlier call.
 */
export interface Clock {
  now(): number;
}

function isEpochMs(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

/**
 * A clock that only moves when told to. Used by tests and offline simulations.
 * It refuses any change that would break the Clock contract (time going backwards,
 * fractional or non-finite values), so a broken test fails loudly instead of silently.
 */
export class FakeClock implements Clock {
  #nowMs: number;

  constructor(startMs: number) {
    if (!isEpochMs(startMs)) {
      throw new RangeError(`FakeClock start must be a non-negative integer, got ${startMs}`);
    }
    this.#nowMs = startMs;
  }

  now(): number {
    return this.#nowMs;
  }

  /** Moves time forward by a non-negative whole number of milliseconds. */
  advance(ms: number): void {
    if (!Number.isSafeInteger(ms) || ms < 0) {
      throw new RangeError(`FakeClock can only advance by a non-negative integer, got ${ms}`);
    }
    this.set(this.#nowMs + ms);
  }

  /** Jumps to an absolute time, which may equal but never precede the current time. */
  set(ms: number): void {
    if (!isEpochMs(ms)) {
      throw new RangeError(`FakeClock time must be a non-negative integer, got ${ms}`);
    }
    if (ms < this.#nowMs) {
      throw new RangeError(`FakeClock cannot go backwards from ${this.#nowMs} to ${ms}`);
    }
    this.#nowMs = ms;
  }
}
