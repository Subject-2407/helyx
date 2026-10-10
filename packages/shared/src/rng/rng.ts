/**
 * A source of random numbers for game logic. Shared code never uses ambient randomness;
 * it receives an Rng so outcomes can be replayed from a seed and tests stay deterministic.
 *
 * Contract:
 * - `nextU32()` returns an integer in [0, U32_MAX].
 * - `next()` consumes exactly one value from the same stream and returns it scaled into
 *   [0, 1) with `unitFromU32`, so mixing the two calls never desynchronizes a replay.
 * - Two generators built from the same input produce the same stream.
 */
export interface Rng {
  nextU32(): number;
  next(): number;
}

/** Largest unsigned 32-bit integer. */
export const U32_MAX = 0xffff_ffff;

/** Number of distinct unsigned 32-bit values; dividing by it maps a u32 into [0, 1). */
export const U32_SPAN = U32_MAX + 1;

export function isU32(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= U32_MAX;
}

/** Maps an unsigned 32-bit integer onto [0, 1). Every Rng derives `next()` from this. */
export function unitFromU32(value: number): number {
  return value / U32_SPAN;
}

/**
 * A test double that replays a fixed list of u32 values and starts over at the end.
 * Lets a test force exact rolls (a crit, a failed upgrade) without hunting for a seed.
 */
export class SequenceRng implements Rng {
  readonly #values: readonly number[];
  #index = 0;

  constructor(values: readonly number[]) {
    if (values.length === 0) {
      throw new RangeError('SequenceRng needs at least one value');
    }
    const invalid = values.find((value) => !isU32(value));
    if (invalid !== undefined) {
      throw new RangeError(`SequenceRng values must be unsigned 32-bit integers, got ${invalid}`);
    }
    this.#values = [...values];
  }

  nextU32(): number {
    const value = this.#values[this.#index];
    if (value === undefined) {
      throw new Error('SequenceRng index left its value list');
    }
    this.#index = (this.#index + 1) % this.#values.length;
    return value;
  }

  next(): number {
    return unitFromU32(this.nextU32());
  }
}
