/**
 * How attunement grows: from qualifying casts, from Resonance Sites, and how long the climb
 * takes. Gains for a character who is not yet a Listener use exactly the same formulas; they
 * simply stay hidden.
 */
import { K } from '../constants.js';
import { assertInRange, assertNonNegative, assertWhole } from '../guards.js';
import { floorTo } from '../math.js';

function assertSync(s: number): void {
  assertInRange(s, 0, K.SYNC_MAX, 'attunement');
}

/** Growth multiplier from intelligence and wisdom. */
export function syncGrowthMult(int: number, wis: number): number {
  return 1 + int / K.SYNC_G_INT + wis / K.SYNC_G_WIS;
}

/** Rounds an attunement value down to its stored precision. */
export function storeSync(value: number): number {
  return floorTo(value, K.SYNC_DECIMALS);
}

/** Gain one tag earns from one qualifying cast; it shrinks as attunement nears its maximum. */
export function syncUseGain(current: number, growthMult: number, tagCount: number): number {
  assertSync(current);
  assertWhole(tagCount, 1, 'tag count');
  const headroom = 1 - current / K.SYNC_MAX;
  return (K.SYNC_USE_BASE * growthMult * headroom * headroom) / tagCount;
}

export interface CastQualification {
  /** The cast landed on at least one hostile monster. */
  readonly hitHostileMonster: boolean;
  /** Highest level among the hostile monsters it landed on. */
  readonly targetLevel: number;
  readonly casterLevel: number;
  /** Hits on players never grant attunement. */
  readonly isPvp: boolean;
  /** Seconds since this ability last granted a gain; `undefined` if it never has. */
  readonly sinceLastGainS: number | undefined;
}

/** Whether a cast (in either mode) grants a gain. */
export function isQualifyingCast(cast: CastQualification): boolean {
  if (!cast.hitHostileMonster || cast.isPvp) return false;
  if (cast.targetLevel < cast.casterLevel - K.SYNC_USE_LEVEL_WINDOW) return false;
  return cast.sinceLastGainS === undefined || cast.sinceLastGainS >= K.SYNC_USE_ICD;
}

/** Gain from meditating at a Resonance Site of the given base strength. */
export function siteSyncGain(base: number, current: number, wis: number): number {
  assertNonNegative(base, 'a site base');
  assertSync(current);
  return base * (1 - current / K.SYNC_MAX) * (1 + wis / K.SYNC_SITE_WIS_DIV);
}

/** Approximate qualifying single-tag casts needed to climb from 0 to `target`. */
export function castsToReach(target: number, growthMult: number): number {
  if (!Number.isFinite(target) || target < 0 || target >= K.SYNC_MAX) {
    throw new RangeError(`a target must be at least 0 and below ${K.SYNC_MAX}, got ${target}`);
  }
  return ((1 / (1 - target / K.SYNC_MAX) - 1) * K.SYNC_MAX) / (K.SYNC_USE_BASE * growthMult);
}
