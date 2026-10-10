/**
 * Default numbers of every status effect. Ability and monster data may override magnitude and
 * duration per application; everything else about a status comes from here.
 */

export const STATUS_NAMES = Object.freeze([
  'burn',
  'bleed',
  'corrode',
  'slow',
  'root',
  'stun',
  'knockback',
  'weaken',
  'exposed',
  'mending',
  'haste',
  'fortify',
  'dispelled',
  'jarred',
] as const);

export type StatusName = (typeof STATUS_NAMES)[number];

/**
 * How a new application of a status meets one that is already running:
 * - `refresh`: replaces it and restarts the timer;
 * - `stack`: adds a stack up to a limit and restarts the timer;
 * - `strongest`: the stronger magnitude wins, an equal one restarts the timer;
 * - `no_refresh`: ignored while the running one lasts;
 * - `instant`: happens once and leaves nothing running.
 */
export type StackingKind = 'refresh' | 'stack' | 'strongest' | 'no_refresh' | 'instant';

export interface StatusDefaults {
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

/**
 * Tuning values for statuses. They mirror the shared balance table and move there once that
 * table exists; nothing outside the status modules should import them.
 */
export const STATUS_K = Object.freeze({
  BURN_FRACTION: 0.25,
  BURN_DURATION_S: 3,
  BURN_TICK_S: 0.5,
  BLEED_FRACTION: 0.08,
  BLEED_DURATION_S: 4,
  BLEED_TICK_S: 1,
  BLEED_MOVING_MULT: 1.5,
  BLEED_MAX_STACKS: 3,
  CORRODE_DEF: -0.15,
  CORRODE_DURATION_S: 5,
  SLOW_MOVE: -0.3,
  SLOW_DURATION_S: 2,
  ROOT_DURATION_S: 1.5,
  STUN_MAX_DURATION_S: 1.5,
  KNOCKBACK_PUSH_S: 0.15,
  WEAKEN_DAMAGE: -0.15,
  WEAKEN_DURATION_S: 4,
  EXPOSED_DAMAGE_TAKEN: 0.15,
  EXPOSED_MIN_DURATION_S: 2,
  EXPOSED_MAX_DURATION_S: 4,
  MENDING_DURATION_S: 5,
  HASTE_MOVE: 0.2,
  HASTE_DURATION_S: 3,
  FORTIFY_DEF: 0.2,
  FORTIFY_DURATION_S: 4,
  JARRED_PER_S: 3,
  JARRED_DURATION_S: 4,
  JARRED_TICK_S: 1,
  STATUS_RESIST_MAX: 1,
} as const);

const SK = STATUS_K;

export const STATUS_DEFAULTS: Readonly<Record<StatusName, StatusDefaults>> = Object.freeze({
  burn: {
    magnitude: SK.BURN_FRACTION,
    durationS: SK.BURN_DURATION_S,
    tickS: SK.BURN_TICK_S,
    stacking: 'refresh',
    harmful: true,
  },
  bleed: {
    magnitude: SK.BLEED_FRACTION,
    durationS: SK.BLEED_DURATION_S,
    tickS: SK.BLEED_TICK_S,
    stacking: 'stack',
    maxStacks: SK.BLEED_MAX_STACKS,
    harmful: true,
  },
  corrode: {
    magnitude: SK.CORRODE_DEF,
    durationS: SK.CORRODE_DURATION_S,
    stacking: 'refresh',
    harmful: true,
  },
  slow: {
    magnitude: SK.SLOW_MOVE,
    durationS: SK.SLOW_DURATION_S,
    stacking: 'strongest',
    harmful: true,
  },
  root: { magnitude: 0, durationS: SK.ROOT_DURATION_S, stacking: 'refresh', harmful: true },
  stun: {
    magnitude: 0,
    durationS: SK.STUN_MAX_DURATION_S,
    maxDurationS: SK.STUN_MAX_DURATION_S,
    stacking: 'no_refresh',
    harmful: true,
  },
  knockback: { magnitude: 0, durationS: 0, stacking: 'instant', harmful: true },
  weaken: {
    magnitude: SK.WEAKEN_DAMAGE,
    durationS: SK.WEAKEN_DURATION_S,
    stacking: 'refresh',
    harmful: true,
  },
  exposed: {
    magnitude: SK.EXPOSED_DAMAGE_TAKEN,
    durationS: SK.EXPOSED_MIN_DURATION_S,
    maxDurationS: SK.EXPOSED_MAX_DURATION_S,
    stacking: 'refresh',
    harmful: true,
  },
  mending: { magnitude: 0, durationS: SK.MENDING_DURATION_S, stacking: 'refresh', harmful: false },
  haste: {
    magnitude: SK.HASTE_MOVE,
    durationS: SK.HASTE_DURATION_S,
    stacking: 'refresh',
    harmful: false,
  },
  fortify: {
    magnitude: SK.FORTIFY_DEF,
    durationS: SK.FORTIFY_DURATION_S,
    stacking: 'refresh',
    harmful: false,
  },
  dispelled: { magnitude: 0, durationS: 0, stacking: 'instant', harmful: true },
  jarred: {
    magnitude: SK.JARRED_PER_S,
    durationS: SK.JARRED_DURATION_S,
    tickS: SK.JARRED_TICK_S,
    stacking: 'refresh',
    harmful: true,
  },
});

/** Seconds over which a knockback pushes its target. */
export const KNOCKBACK_PUSH_S = SK.KNOCKBACK_PUSH_S;

/**
 * Duration of one application after status resist. `requestedS` overrides the default and is
 * held to the status's cap. Status resist shortens harmful effects only.
 */
export function statusDuration(
  name: StatusName,
  statusResist: number,
  requestedS?: number,
): number {
  if (!Number.isFinite(statusResist) || statusResist < 0 || statusResist >= SK.STATUS_RESIST_MAX) {
    throw new RangeError(`status resist must be at least 0 and below 1, got ${statusResist}`);
  }
  const row = STATUS_DEFAULTS[name];
  const asked = requestedS ?? row.durationS;
  if (!Number.isFinite(asked) || asked < 0) {
    throw new RangeError(`a status duration must be zero or more, got ${asked}`);
  }
  const capped = Math.min(asked, row.maxDurationS ?? asked);
  return row.harmful ? capped * (1 - statusResist) : capped;
}
