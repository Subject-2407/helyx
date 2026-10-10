/** Small numeric helpers the balance formulas share. */

/**
 * Digits kept when cleaning float noise before rounding. Far finer than any stored precision,
 * far coarser than the error of a few float operations, so `0.29 * 100` floors to 29 (not 28)
 * and 0.0105 rounds to three decimals as 0.011.
 */
const NOISE_DECIMALS = 6;
const NOISE_SCALE = 10 ** NOISE_DECIMALS;

function denoise(scaled: number): number {
  return Math.round(scaled * NOISE_SCALE) / NOISE_SCALE;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

/** Rounds to `decimals` places, halves up, ignoring float noise next to a half. */
export function roundTo(x: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(denoise(x * scale)) / scale;
}

/** Rounds down to `decimals` places, ignoring float noise just below a boundary. */
export function floorTo(x: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.floor(denoise(x * scale)) / scale;
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
