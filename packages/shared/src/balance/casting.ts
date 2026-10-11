/**
 * Casting an Aspect ability in the force mode, plus the power multiplier of a cast in any mode.
 *
 * The force mode spends Mana and works for everyone. Anything that changes its cost or power for
 * some casters is worked out elsewhere and handed in as a plain factor, so this file reads only
 * public numbers.
 */
import type { CastMode } from '../types/combat.js';
import { K } from './constants.js';
import { assertNonNegative } from './guards.js';
import { profCostMult } from './proficiency.js';

/** A mana factor is a share of the base cost: above 0 (a cast is never free) and at most 1. */
function assertManaFactor(manaFactor: number): void {
  if (!Number.isFinite(manaFactor) || manaFactor <= 0 || manaFactor > 1) {
    throw new RangeError(`a mana factor must be above 0 and at most 1, got ${manaFactor}`);
  }
}

/**
 * Whole Mana a force-mode cast costs. `manaFactor` in (0, 1] scales the base cost for casters
 * whose cost is reduced, and is 1 for everyone else. Overcharge must already be allowed.
 */
export function forceManaCost(
  baseMana: number,
  manaFactor: number,
  prof: number,
  overcharge: boolean,
): number {
  assertNonNegative(baseMana, 'a base cost');
  assertManaFactor(manaFactor);
  const charge = overcharge ? K.OC_COST : 1;
  return Math.round(baseMana * manaFactor * profCostMult(prof) * charge);
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
 * How a hit was cast, as far as its power multiplier is concerned. A `scaled` cast carries a
 * power multiplier that the caller has already worked out.
 */
export type CastModeInput =
  | { readonly kind: 'physical' }
  | { readonly kind: 'force'; readonly overcharge: boolean }
  | { readonly kind: 'scaled'; readonly power: number };

/** Power multiplier of a cast in its mode; physical abilities are unaffected by cast mode. */
export function castModeMult(mode: CastModeInput): number {
  switch (mode.kind) {
    case 'physical':
      return 1;
    case 'force':
      return forcePower(mode.overcharge);
    case 'scaled':
      assertNonNegative(mode.power, 'cast power');
      return mode.power;
  }
}

/** Whole Stamina a physical ability costs at the given proficiency. */
export function staminaAbilityCost(baseStamina: number, prof: number): number {
  assertNonNegative(baseStamina, 'a base cost');
  return Math.round(baseStamina * profCostMult(prof));
}
