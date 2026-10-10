/** Small numeric helpers the balance formulas share. */

/**
 * Digits kept when cleaning float noise before a floor. Far finer than any stored precision,
 * far coarser than the error of a few float operations, so `0.29 * 100` floors to 29, not 28.
 */
const FLOOR_NOISE_DECIMALS = 6;
const FLOOR_NOISE_SCALE = 10 ** FLOOR_NOISE_DECIMALS;

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Rounds to `decimals` places, halves away from zero for positive numbers. */
export function roundTo(x: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(x * scale) / scale;
}

/** Rounds down to `decimals` places, ignoring float noise just below a boundary. */
export function floorTo(x: number, decimals: number): number {
  const scale = 10 ** decimals;
  const scaled = Math.round(x * scale * FLOOR_NOISE_SCALE) / FLOOR_NOISE_SCALE;
  return Math.floor(scaled) / scale;
}

export function sum(values: readonly number[]): number {
  let total = 0;
  for (const value of values) {
    total += value;
  }
  return total;
}

/** Arithmetic mean; an empty list has mean 0. */
export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : sum(values) / values.length;
}
