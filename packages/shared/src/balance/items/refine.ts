/** Refinement: rerolling and honing affix lines. Neither can fail; unique traits are untouchable. */
import { K } from '../constants.js';
import { assertFraction, assertWhole } from '../guards.js';
import { roundTo } from '../math.js';

export interface RerollCost {
  readonly stones: number;
  readonly coins: number;
}

/** What one reroll costs, growing with the rerolls already made up to a cap. */
export function rerollCost(ilvl: number, rerollCount: number): RerollCost {
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  assertWhole(rerollCount, 0, 'reroll count');
  const steps = 1 + Math.min(rerollCount, K.REROLL_COUNT_CAP);
  return { stones: steps, coins: K.REROLL_COIN_BASE * ilvl * steps };
}

/** Quality after one hone, never above 1. */
export function hone(quality: number): number {
  assertFraction(quality, 'quality');
  return Math.min(1, roundTo(quality + K.HONE_STEP, K.AFFIX_QUALITY_DECIMALS));
}

export interface HoneCost {
  readonly powder: number;
  readonly coins: number;
}

export function honeCost(ilvl: number): HoneCost {
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  return { powder: 1, coins: K.HONE_COIN_BASE * ilvl };
}

/** Affix lines can be refined; unique traits cannot. */
export function canRefine(line: { readonly isTrait: boolean }): boolean {
  return !line.isTrait;
}
