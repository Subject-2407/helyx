/**
 * Encumbrance: how carried weight compared with carry capacity slows movement and limits
 * dashing. Tiers are 0 normal, 1 burdened, 2 heavily burdened and 3 overloaded.
 */

export type EncumbranceTier = 0 | 1 | 2 | 3;

interface EncumbranceBand {
  readonly tier: EncumbranceTier;
  /** Highest weight-to-capacity ratio inside the band, inclusive. */
  readonly maxRatio: number;
  readonly moveMult: number;
  /** Dash stamina cost multiplier, or null when dashing is not allowed. */
  readonly dashCostMult: number | null;
}

/**
 * The bands, lightest first. They mirror the shared rule table and move there once that table
 * exists; nothing outside this module should import them.
 */
const ENCUMBRANCE_BANDS: readonly EncumbranceBand[] = Object.freeze([
  { tier: 0, maxRatio: 1.0, moveMult: 1, dashCostMult: 1 },
  { tier: 1, maxRatio: 1.25, moveMult: 0.8, dashCostMult: 1.5 },
  { tier: 2, maxRatio: 1.5, moveMult: 0.5, dashCostMult: null },
  { tier: 3, maxRatio: Number.POSITIVE_INFINITY, moveMult: 0, dashCostMult: null },
] as const);

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

function bandFor(tier: EncumbranceTier): EncumbranceBand {
  const band = ENCUMBRANCE_BANDS[tier];
  if (band === undefined) throw new RangeError(`unknown encumbrance tier ${tier}`);
  return band;
}

export function encumbranceTier(ratio: number): EncumbranceTier {
  if (!(ratio >= 0)) throw new RangeError(`encumbrance ratio must not be negative, got ${ratio}`);
  const band = ENCUMBRANCE_BANDS.find((b) => ratio <= b.maxRatio);
  // The last band has no upper bound, so a finite or infinite ratio always finds one.
  return (band ?? bandFor(3)).tier;
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
