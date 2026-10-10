/**
 * Rolls built on an injected `Rng`. Each helper consumes a fixed number of values from the
 * stream (one, unless stated), so a replay that makes the same calls gets the same results.
 */
import type { Rng } from './rng.js';

/** Uniform whole number in [lo, hi], both ends included. */
export function randInt(rng: Rng, lo: number, hi: number): number {
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || hi < lo) {
    throw new RangeError(`randInt needs whole bounds with lo <= hi, got ${lo} and ${hi}`);
  }
  return lo + Math.floor(rng.next() * (hi - lo + 1));
}

/** Uniform number in [lo, hi). */
export function randFloat(rng: Rng, lo: number, hi: number): number {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi < lo) {
    throw new RangeError(`randFloat needs finite bounds with lo <= hi, got ${lo} and ${hi}`);
  }
  return lo + rng.next() * (hi - lo);
}

/** True with probability `p`: never for 0, always for 1. */
export function chance(rng: Rng, p: number): boolean {
  if (!Number.isFinite(p) || p < 0 || p > 1) {
    throw new RangeError(`a chance must be between 0 and 1, got ${p}`);
  }
  return rng.next() < p;
}

/** One element of a non-empty list, each equally likely. */
export function pickUniform<T>(rng: Rng, list: readonly T[]): T {
  if (list.length === 0) {
    throw new RangeError('pickUniform needs a non-empty list');
  }
  return list[randInt(rng, 0, list.length - 1)] as T;
}

function weightTotal(weights: readonly number[]): number {
  let total = 0;
  for (const weight of weights) {
    if (!Number.isFinite(weight) || weight < 0) {
      throw new RangeError(`weights must be finite and not negative, got ${weight}`);
    }
    total += weight;
  }
  if (!(total > 0)) {
    throw new RangeError('at least one weight must be above zero');
  }
  return total;
}

/**
 * Index picked with probability proportional to its weight. Weights are relative: they are
 * divided by their sum, so they need not add up to 1. A zero weight is never picked.
 */
export function pickWeighted(rng: Rng, weights: readonly number[]): number {
  const total = weightTotal(weights);
  const roll = rng.next() * total;
  let cumulative = 0;
  let lastPositive = 0;
  for (const [index, weight] of weights.entries()) {
    if (weight === 0) continue;
    cumulative += weight;
    lastPositive = index;
    if (roll < cumulative) return index;
  }
  // Float rounding can leave the roll a hair above the summed weights; the last option wins.
  return lastPositive;
}
