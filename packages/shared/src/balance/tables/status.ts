import type { StatusId } from '../../types/combat.js';
import { COMBAT_K as K } from '../constants/combat.js';

/**
 * How a new application of a status meets one that is already running:
 * - `refresh`: replaces it and restarts the timer;
 * - `stack`: adds a stack up to a limit and restarts the timer;
 * - `strongest`: the stronger magnitude wins, an equal one restarts the timer;
 * - `no_refresh`: ignored while the running one lasts;
 * - `instant`: happens once and leaves nothing running.
 */
export type StackingKind = 'refresh' | 'stack' | 'strongest' | 'no_refresh' | 'instant';

export interface StatusRow {
  /**
   * Default strength. Its unit depends on the status: a fraction of the triggering hit for
   * damage over time, a signed fraction of a stat for stat changes, units per second for
   * `jarred`, and 0 where the strength comes from the ability data (`mending`, `knockback`).
   */
  readonly magnitude: number;
  /** Default duration in seconds; 0 for instant effects. */
  readonly durationS: number;
  /** Longest duration an application may ask for, when the status has a cap. */
  readonly maxDurationS?: number;
  /** Seconds between ticks for effects that tick. */
  readonly tickS?: number;
  readonly stacking: StackingKind;
  /** Stack limit for `stack` statuses. */
  readonly maxStacks?: number;
  /** Harmful effects are shortened by status resist; helpful ones are not. */
  readonly harmful: boolean;
}

function lasting(
  magnitude: number,
  durationS: number,
  stacking: StackingKind,
  harmful = true,
): StatusRow {
  return { magnitude, durationS, stacking, harmful };
}

const INSTANT: StatusRow = { magnitude: 0, durationS: 0, stacking: 'instant', harmful: true };

/** Default numbers of every status effect; ability and monster data may override them. */
export const STATUS_TABLE: Readonly<Record<StatusId, StatusRow>> = Object.freeze({
  burn: { ...lasting(K.BURN_FRACTION, K.BURN_DURATION_S, 'refresh'), tickS: K.BURN_TICK_S },
  bleed: {
    ...lasting(K.BLEED_FRACTION, K.BLEED_DURATION_S, 'stack'),
    tickS: K.BLEED_TICK_S,
    maxStacks: K.BLEED_MAX_STACKS,
  },
  corrode: lasting(K.CORRODE_DEF, K.CORRODE_DURATION_S, 'refresh'),
  slow: lasting(K.SLOW_MOVE, K.SLOW_DURATION_S, 'strongest'),
  root: lasting(0, K.ROOT_DURATION_S, 'refresh'),
  stun: { ...lasting(0, K.STUN_MAX_DURATION_S, 'no_refresh'), maxDurationS: K.STUN_MAX_DURATION_S },
  knockback: INSTANT,
  weaken: lasting(K.WEAKEN_DAMAGE, K.WEAKEN_DURATION_S, 'refresh'),
  exposed: {
    ...lasting(K.EXPOSED_DAMAGE_TAKEN, K.EXPOSED_MIN_DURATION_S, 'refresh'),
    maxDurationS: K.EXPOSED_MAX_DURATION_S,
  },
  mending: lasting(0, K.MENDING_DURATION_S, 'refresh', false),
  haste: lasting(K.HASTE_MOVE, K.HASTE_DURATION_S, 'refresh', false),
  fortify: lasting(K.FORTIFY_DEF, K.FORTIFY_DURATION_S, 'refresh', false),
  dispelled: INSTANT,
  jarred: { ...lasting(K.JARRED_PER_S, K.JARRED_DURATION_S, 'refresh'), tickS: K.JARRED_TICK_S },
});

/** Duration multiplier of the first, second and third control effect inside one window. */
export const CC_DR_STEPS: readonly number[] = Object.freeze([1, K.CC_DR_SECOND, K.CC_DR_THIRD]);

/** Default poise damage of a basic hit by weapon kind; abilities set their own. */
export type PoiseHitKind = 'basic' | 'dagger' | 'greatsword' | 'bow_charged';

export const POISE_HIT_DAMAGE: Readonly<Record<PoiseHitKind, number>> = Object.freeze({
  basic: K.POISE_HIT_BASIC,
  dagger: K.POISE_HIT_DAGGER,
  greatsword: K.POISE_HIT_GREATSWORD,
  bow_charged: K.POISE_HIT_BOW_CHARGED,
});
