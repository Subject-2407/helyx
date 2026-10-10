import type { Rng } from '@helyx/shared';
import { unitFromU32 } from '@helyx/shared';

// Seeded generator for the protocol tests (sfc32: a 128-bit state, 32-bit output generator).
// The state starts from three fixed constants plus the seed and is warmed up by a fixed number
// of discarded rounds so that close seeds produce unrelated streams.

const STATE_A = 0x9e3779b9;
const STATE_B = 0x243f6a88;
const STATE_C = 0xb7e15162;
const WARM_UP_ROUNDS = 12;

/** Seed shared by every randomized protocol test, so failures replay exactly. */
export const PROTOCOL_TEST_SEED = 0x48454c59;

export function createTestRng(seed: number): Rng {
  let a = STATE_A;
  let b = STATE_B;
  let c = STATE_C;
  let d = seed >>> 0;
  const nextU32 = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let round = 0; round < WARM_UP_ROUNDS; round += 1) {
    nextU32();
  }
  return { nextU32, next: () => unitFromU32(nextU32()) };
}

/** Uniform integer in [lo, hi]. */
export function randomInt(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng.next() * (hi - lo + 1));
}

export function pickOne<T>(rng: Rng, list: readonly T[]): T {
  const item = list[randomInt(rng, 0, list.length - 1)];
  if (item === undefined) {
    throw new RangeError('pickOne needs a non-empty list');
  }
  return item;
}
