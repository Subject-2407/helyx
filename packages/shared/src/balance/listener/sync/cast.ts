/**
 * The second cast mode: what attunement brings to a cast, what the mode costs in Dissonance
 * and how hard it hits. A caster who is not a Listener never reaches any of this; for them
 * attunement always counts as 0 and only the force mode exists.
 */
import type { Aspect, PartialAspectVector } from '../../../types/aspect.js';
import { K_LISTENER } from '../constants.js';
import { assertInRange, assertNonNegative } from '../../guards.js';
import { clamp, roundTo } from '../../math.js';
import { profCostMult } from '../../proficiency.js';

/** Lowest attunement every tag needs before the sync mode can be used. */
export const MIN_SYNC_TO_CAST = K_LISTENER.SYNC_MIN_CAST;

function assertSync(s: number): void {
  assertInRange(s, 0, K_LISTENER.SYNC_MAX, 'attunement');
}

/**
 * Attunement the caster brings to an ability: the mean over its tags. A caster who is not a
 * Listener always counts as 0, whatever is stored for them.
 */
export function effectiveSync(
  syncByTag: PartialAspectVector,
  tags: readonly Aspect[],
  isListener: boolean,
): number {
  if (!isListener || tags.length === 0) {
    return 0;
  }
  let total = 0;
  for (const tag of tags) {
    total += syncByTag[tag] ?? 0;
  }
  return total / tags.length;
}

/**
 * Share of the force-mode Mana cost a caster pays at attunement `s`, for the public cost formula.
 * A caster who is not a Listener brings 0 and pays the full cost.
 */
export function attunedManaFactor(s: number): number {
  assertSync(s);
  return 1 - (K_LISTENER.SYNC_MANA_RED * s) / K_LISTENER.SYNC_MAX;
}

/** Effect multiplier from attunement; it applies in both cast modes. */
export function syncEffectBonus(s: number): number {
  assertSync(s);
  return 1 + (K_LISTENER.SYNC_EFFECT * s) / K_LISTENER.SYNC_MAX;
}

/** Dissonance a sync-mode cast costs, kept to one decimal. */
export function syncDissonanceCost(baseDissonance: number, s: number, prof: number): number {
  assertNonNegative(baseDissonance, 'a base cost');
  assertSync(s);
  const relief =
    (1 - (K_LISTENER.SYNC_DIS_RED * s) / K_LISTENER.SYNC_MAX) ** K_LISTENER.SYNC_DIS_EXP;
  return roundTo(baseDissonance * relief * profCostMult(prof), K_LISTENER.DIS_DECIMALS);
}

/** Power multiplier of a sync-mode cast at attunement `s` and mean local resonance `rbar`. */
export function syncPower(s: number, rbar: number): number {
  assertSync(s);
  assertInRange(rbar, K_LISTENER.RES_MIN, K_LISTENER.RES_MAX, 'resonance');
  const raw =
    K_LISTENER.SP_BASE + (K_LISTENER.SP_SYNC * s) / K_LISTENER.SYNC_MAX + K_LISTENER.SP_RES * rbar;
  return clamp(raw, K_LISTENER.SP_MIN, K_LISTENER.SP_MAX);
}

/** Whether the sync mode is allowed: only Listeners, and only with enough attunement in every tag. */
export function canSyncCast(
  syncByTag: PartialAspectVector,
  tags: readonly Aspect[],
  isListener: boolean,
): boolean {
  if (!isListener || tags.length === 0) {
    return false;
  }
  return tags.every((tag) => (syncByTag[tag] ?? 0) >= K_LISTENER.SYNC_MIN_CAST);
}

/** Seconds the sync mode adds to an Aspect ability's wind-up. */
export function syncWindupPenaltyS(): number {
  return K_LISTENER.SYNC_WINDUP;
}

/** Dissonance added when a sync-mode wind-up is broken by a stun or stagger. */
export function syncInterruptDissonance(): number {
  return K_LISTENER.SYNC_INTERRUPT_DIS;
}
