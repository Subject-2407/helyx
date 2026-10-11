/**
 * Changes to a character's attunement vector: gains under the total cap, release at a shrine,
 * the share that passes to the next adventurer, and the tier of a value.
 */
import { ASPECTS, type Aspect, type PartialAspectVector } from '../../../types/aspect.js';
import type { SyncTier } from '../../../types/combat.js';
import { K_LISTENER } from '../constants.js';
import { SYNC_TIER_TABLE } from '../tables.js';
import { assertNonNegative, assertWhole } from '../../guards.js';
import { floorTo, sum } from '../../math.js';
import { storeSync } from './growth.js';

/** Total attunement cap after the given number of passed Convergence Trials. */
export function syncCap(convergenceTrials: number): number {
  assertWhole(convergenceTrials, 0, 'trial count');
  return Math.min(
    K_LISTENER.SYNC_CAP_MAX,
    K_LISTENER.SYNC_CAP_START + K_LISTENER.SYNC_CAP_STEP * convergenceTrials,
  );
}

/** Sum of attunement over every Aspect. */
export function totalSync(sync: PartialAspectVector): number {
  return sum(ASPECTS.map((aspect) => sync[aspect] ?? 0));
}

export interface SyncGainResult {
  readonly next: PartialAspectVector;
  /** Gain actually added after the caps. */
  readonly applied: number;
  /** True when a cap cut the gain short; the excess is discarded. */
  readonly truncated: boolean;
}

/**
 * Adds a gain to one Aspect. A gain that would push the total over the cap, or the Aspect
 * over its maximum, is cut to fit; the stored value keeps six decimals.
 */
export function applySyncGain(
  sync: PartialAspectVector,
  aspect: Aspect,
  delta: number,
  cap: number,
): SyncGainResult {
  assertNonNegative(delta, 'a gain');
  const current = sync[aspect] ?? 0;
  const room = Math.max(0, Math.min(cap - totalSync(sync), K_LISTENER.SYNC_MAX - current));
  const fitted = Math.min(delta, room);
  const value = storeSync(current + fitted);
  return {
    next: { ...sync, [aspect]: value },
    applied: value - current,
    truncated: fitted < delta,
  };
}

/** Gives up attunement at a Resonance Shrine; the released amount is gone for good. */
export function releaseSync(
  sync: PartialAspectVector,
  aspect: Aspect,
  amount: number,
): PartialAspectVector {
  assertNonNegative(amount, 'a released amount');
  const current = sync[aspect] ?? 0;
  if (amount > current) {
    throw new RangeError(`cannot release ${amount} from ${current}`);
  }
  return { ...sync, [aspect]: storeSync(current - amount) };
}

/** The share of one Aspect's attunement that passes to the next adventurer; none for Outlaws. */
export function syncEcho(old: number, wasOutlaw: boolean): number {
  assertNonNegative(old, 'attunement');
  return wasOutlaw ? 0 : floorTo(K_LISTENER.SYNC_ECHO * old, K_LISTENER.SYNC_ECHO_DECIMALS);
}

/** `syncEcho` for every Aspect of a vector. */
export function syncEchoVector(old: PartialAspectVector, wasOutlaw: boolean): PartialAspectVector {
  const out: Partial<Record<Aspect, number>> = {};
  for (const aspect of ASPECTS) {
    const value = old[aspect];
    if (value !== undefined) out[aspect] = syncEcho(value, wasOutlaw);
  }
  return out;
}

/** The tier a value falls in. */
export function syncTier(value: number): SyncTier {
  let tier: SyncTier = 'novice';
  for (const band of SYNC_TIER_TABLE) {
    if (value >= band.min) tier = band.name;
  }
  return tier;
}
