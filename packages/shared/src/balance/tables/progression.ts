import type { EncumbranceTier } from '../../types/combat.js';
import { CHARACTER_K as K } from '../constants/character.js';
import { COMBAT_K } from '../constants/combat.js';

/** Experience multiplier for a level difference band (monster level minus player level). */
export interface LevelDiffBand {
  /** Highest difference inside the band, inclusive. */
  readonly maxDelta: number;
  readonly mult: number;
}

/** Level-difference bands, lowest difference first; the last band has no upper bound. */
export const LEVEL_DIFF_XP_BANDS: readonly LevelDiffBand[] = Object.freeze([
  { maxDelta: -6, mult: 0.1 },
  { maxDelta: -3, mult: 0.6 },
  { maxDelta: 2, mult: 1 },
  { maxDelta: 5, mult: 1.2 },
  { maxDelta: Number.POSITIVE_INFINITY, mult: 1.3 },
]);

export interface EncumbranceBand {
  readonly tier: EncumbranceTier;
  /** Highest weight-to-capacity ratio inside the band, inclusive. */
  readonly maxRatio: number;
  readonly moveMult: number;
  /** Dash stamina cost multiplier, or null when dashing is not allowed. */
  readonly dashCostMult: number | null;
}

/** Load bands, lightest first; the last band has no upper bound. */
export const ENCUMBRANCE_BANDS: readonly EncumbranceBand[] = Object.freeze([
  { tier: 0, maxRatio: K.ENC_NORMAL_MAX, moveMult: 1, dashCostMult: 1 },
  {
    tier: 1,
    maxRatio: K.ENC_BURDENED_MAX,
    moveMult: K.ENC_BURDENED_MOVE,
    dashCostMult: COMBAT_K.DASH_ENCUMBERED_MULT,
  },
  { tier: 2, maxRatio: K.ENC_HEAVY_MAX, moveMult: K.ENC_HEAVY_MOVE, dashCostMult: null },
  { tier: 3, maxRatio: Number.POSITIVE_INFINITY, moveMult: 0, dashCostMult: null },
]);
