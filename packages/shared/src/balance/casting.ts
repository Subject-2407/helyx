/**
 * Casting an Aspect ability in the force mode, plus the power multiplier of a cast in any mode.
 *
 * The force mode spends Mana and works for everyone. Everything about the other mode lives in
 * its own modules, which this file never imports, so code that only casts in the force mode
 * can leave them out entirely. A caller that resolves the other mode passes its power in.
 */
import type { CastMode } from '../types/combat.js';
import { K } from './constants.js';
import { assertInRange, assertNonNegative } from './guards.js';
import { profCostMult } from './proficiency.js';

/** Whole Mana a force-mode cast costs at attunement `s`. Overcharge must already be allowed. */
export function forceManaCost(
  baseMana: number,
  s: number,
  prof: number,
  overcharge: boolean,
): number {
  assertNonNegative(baseMana, 'a base cost');
  assertInRange(s, 0, K.SYNC_MAX, 'attunement');
  const attunement = 1 - (K.SYNC_MANA_RED * s) / K.SYNC_MAX;
  const charge = overcharge ? K.OC_COST : 1;
  return Math.round(baseMana * attunement * profCostMult(prof) * charge);
}

/** Power multiplier of a force-mode cast. */
export function forcePower(overcharge: boolean): number {
  return overcharge ? K.OC_POWER : 1;
}

export interface OverchargeRequest {
  readonly mode: CastMode;
  /** Whether the ability's data marks it as able to overcharge. */
  readonly overchargeable: boolean;
  /** How long the key was held before release, in seconds. */
  readonly holdS: number;
}

/** Overcharge needs the force mode, an able ability, and a long enough hold. */
export function canOvercharge(request: OverchargeRequest): boolean {
  return request.mode === 'force' && request.overchargeable && request.holdS >= K.OC_HOLD;
}

/**
 * How a hit was cast, as far as its power multiplier is concerned. The other mode carries the
 * power its own module computed.
 */
export type CastModeInput =
  | { readonly kind: 'physical' }
  | { readonly kind: 'force'; readonly overcharge: boolean }
  | { readonly kind: 'sync'; readonly power: number };

/** Power multiplier of a cast in its mode; physical abilities are unaffected by cast mode. */
export function castModeMult(mode: CastModeInput): number {
  switch (mode.kind) {
    case 'physical':
      return 1;
    case 'force':
      return forcePower(mode.overcharge);
    case 'sync':
      assertNonNegative(mode.power, 'cast power');
      return mode.power;
  }
}

/** Whole Stamina a physical ability costs at the given proficiency. */
export function staminaAbilityCost(baseStamina: number, prof: number): number {
  assertNonNegative(baseStamina, 'a base cost');
  return Math.round(baseStamina * profCostMult(prof));
}
