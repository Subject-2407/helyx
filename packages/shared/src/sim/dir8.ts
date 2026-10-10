/** Unit vectors of the eight movement directions, in screen space (y points down). */
import { NET } from '../net-constants.js';
import type { Dir8 } from '../types/movement.js';

const D = NET.DIAG;

/** Vector of each `Dir8`, indexed by its value; 0 (no input) is the zero vector. */
export const DIR: readonly (readonly [number, number])[] = Object.freeze([
  [0, 0],
  [1, 0],
  [D, -D],
  [0, -1],
  [-D, -D],
  [-1, 0],
  [-D, D],
  [0, 1],
  [D, D],
]);

/** Direction for each pair of axis signs, indexed by `(sy + 1) * 3 + (sx + 1)`. */
const BY_SIGNS: readonly Dir8[] = Object.freeze([4, 3, 2, 5, 0, 1, 6, 7, 8]);

const EAST: Dir8 = 1;
const WEST: Dir8 = 5;

export function dirVector(dir: Dir8): readonly [number, number] {
  const vector = DIR[dir];
  if (vector === undefined) {
    throw new RangeError(`not a movement direction: ${String(dir)}`);
  }
  return vector;
}

/** The direction whose axis signs match a vector; the zero vector gives 0. */
export function dirFromVector(x: number, y: number): Dir8 {
  const index = (Math.sign(y) + 1) * 3 + (Math.sign(x) + 1);
  return BY_SIGNS[index] ?? 0;
}

/** The direction a character faces when it has no movement input. */
export function facingDir(facing: 1 | -1): Dir8 {
  return facing === 1 ? EAST : WEST;
}
