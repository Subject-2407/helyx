/**
 * Encumbrance: how carried weight compared with carry capacity slows movement and limits
 * dashing. Tiers are 0 normal, 1 burdened, 2 heavily burdened and 3 overloaded.
 */

import type { EncumbranceTier } from '../types/combat.js';
import { ENCUMBRANCE_BANDS, type EncumbranceBand } from './constants.js';

export interface EncumbranceEffects {
  readonly ratio: number;
  readonly tier: EncumbranceTier;
  readonly moveMult: number;
  readonly dashCostMult: number | null;
  readonly canDash: boolean;
  readonly canMove: boolean;
}

/** Carried weight divided by carry capacity. */
export function encumbranceRatio(totalWeight: number, carryCapacity: number): number {
  if (!(carryCapacity > 0)) {
    throw new RangeError(`carry capacity must be positive, got ${carryCapacity}`);
  }
  if (!(totalWeight >= 0)) {
    throw new RangeError(`carried weight must not be negative, got ${totalWeight}`);
  }
  return totalWeight / carryCapacity;
}

/** The band with no upper bound, which every ratio beyond the others falls into. */
const HEAVIEST_BAND = ENCUMBRANCE_BANDS.at(-1);

function bandFor(tier: EncumbranceTier): EncumbranceBand {
  const band = ENCUMBRANCE_BANDS[tier];
  if (band === undefined) throw new RangeError(`unknown encumbrance tier ${tier}`);
  return band;
}

export function encumbranceTier(ratio: number): EncumbranceTier {
  if (!(ratio >= 0)) throw new RangeError(`encumbrance ratio must not be negative, got ${ratio}`);
  const band = ENCUMBRANCE_BANDS.find((b) => ratio <= b.maxRatio) ?? HEAVIEST_BAND;
  if (band === undefined) throw new RangeError('the encumbrance band table is empty');
  return band.tier;
}

/** Multiplier on move speed; 0 means the character cannot move but can still act. */
export function encumbranceMoveMult(tier: EncumbranceTier): number {
  return bandFor(tier).moveMult;
}

/** Multiplier on dash stamina cost, or null when the load forbids dashing. */
export function encumbranceDashCostMult(tier: EncumbranceTier): number | null {
  return bandFor(tier).dashCostMult;
}

export function encumbranceCanDash(tier: EncumbranceTier): boolean {
  return encumbranceDashCostMult(tier) !== null;
}

export function encumbranceCanMove(tier: EncumbranceTier): boolean {
  return encumbranceMoveMult(tier) > 0;
}

/** Every encumbrance effect for a carried weight and a carry capacity. */
export function encumbranceEffects(totalWeight: number, carryCapacity: number): EncumbranceEffects {
  const ratio = encumbranceRatio(totalWeight, carryCapacity);
  const tier = encumbranceTier(ratio);
  return {
    ratio,
    tier,
    moveMult: encumbranceMoveMult(tier),
    dashCostMult: encumbranceDashCostMult(tier),
    canDash: encumbranceCanDash(tier),
    canMove: encumbranceCanMove(tier),
  };
}
