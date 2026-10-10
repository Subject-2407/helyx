/**
 * Damage over time from burn and bleed. These return unrounded amounts; each tick then goes
 * through the damage pipeline as a tick that can never crit.
 */
import { K } from '../constants.js';

/** Small slack so a duration that is a whole number of ticks is not lost to float error. */
const TICK_EPSILON = 1e-9;

function assertDamage(hitDamage: number): void {
  if (!Number.isFinite(hitDamage) || hitDamage < 0) {
    throw new RangeError(`the triggering hit must be zero or more, got ${hitDamage}`);
  }
}

/** Number of whole ticks that fit into a duration. */
export function dotTickCount(durationS: number, tickS: number): number {
  if (!(tickS > 0) || !Number.isFinite(durationS) || durationS < 0) {
    throw new RangeError(`invalid tick timing: duration ${durationS}, tick ${tickS}`);
  }
  return Math.floor(durationS / tickS + TICK_EPSILON);
}

/**
 * Damage of one burn tick. A full-length burn deals its share of the triggering hit over its
 * default duration; a burn shortened by status resist simply has fewer ticks.
 */
export function burnTickDamage(hitDamage: number): number {
  assertDamage(hitDamage);
  return (hitDamage * K.BURN_FRACTION * K.BURN_TICK_S) / K.BURN_DURATION_S;
}

/** Damage of one bleed tick for the given stacks; it hurts more while the target moves. */
export function bleedTickDamage(hitDamage: number, stacks: number, moving: boolean): number {
  assertDamage(hitDamage);
  if (!Number.isInteger(stacks) || stacks < 1 || stacks > K.BLEED_MAX_STACKS) {
    throw new RangeError(
      `bleed stacks must be a whole number from 1 to ${K.BLEED_MAX_STACKS}, got ${stacks}`,
    );
  }
  const motion = moving ? K.BLEED_MOVING_MULT : 1;
  return hitDamage * K.BLEED_FRACTION * stacks * motion;
}
