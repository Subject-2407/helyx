import { unitFromU32, type Rng } from './rng.js';

/**
 * sfc32 ("small fast counting", 128-bit state, 32-bit output): the seeded generator every room
 * and every randomized test uses, so an outcome replays exactly from its seed.
 *
 * Seeding: the state words a, b and c start from three fixed constants (the fractional bits
 * of the golden ratio, pi and e), d starts from the u32 seed, and the first 12 outputs are
 * discarded so that neighbouring seeds lead to unrelated streams. Changing any of this
 * changes every recorded replay, so the golden stream test pins it.
 */
const STATE_A = 0x9e3779b9;
const STATE_B = 0x243f6a88;
const STATE_C = 0xb7e15162;
const WARM_UP_ROUNDS = 12;

const ROTATE_LEFT = 21;
const ROTATE_RIGHT = 32 - ROTATE_LEFT;
const SHIFT_RIGHT = 9;
const SHIFT_LEFT = 3;

export function createSfc32(seed: number): Rng {
  let a = STATE_A;
  let b = STATE_B;
  let c = STATE_C;
  let d = seed >>> 0;
  const nextU32 = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> SHIFT_RIGHT);
    b = (c + (c << SHIFT_LEFT)) | 0;
    c = (c << ROTATE_LEFT) | (c >>> ROTATE_RIGHT);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let round = 0; round < WARM_UP_ROUNDS; round += 1) {
    nextU32();
  }
  return { nextU32, next: () => unitFromU32(nextU32()) };
}
