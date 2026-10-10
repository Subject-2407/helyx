/**
 * Dissonance: the strain the second cast mode builds up. It rises with casts and jarring hits,
 * decays over time, and grows dangerous in bands until it breaks loose. Only Listeners ever
 * carry any; the server never applies it to anyone else.
 */
import { pickUniform, chance } from '../rng/random.js';
import type { Rng } from '../rng/rng.js';
import { ASPECTS, type Aspect } from '../types/aspect.js';
import type { DissonanceState } from '../types/combat.js';
import { DISSONANCE_STATE_TABLE, K } from './constants.js';
import { assertNonNegative } from './guards.js';
import { clamp, roundTo } from './math.js';

/** Keeps a value inside the meter, to one decimal. */
export function clampDissonance(value: number): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`dissonance must be finite, got ${value}`);
  }
  return roundTo(clamp(value, 0, K.DIS_MAX), K.DIS_DECIMALS);
}

/** Adds (or, when negative, removes) strain; the meter never drops below 0. */
export function applyDissonance(current: number, delta: number): number {
  return clampDissonance(current + delta);
}

/** The band a meter value falls in. */
export function dissonanceState(value: number): DissonanceState {
  let state: DissonanceState = 'calm';
  for (const band of DISSONANCE_STATE_TABLE) {
    if (value >= band.min) state = band.name;
  }
  return state;
}

export interface DecayContext {
  readonly wis: number;
  readonly inCombat: boolean;
  /** Seconds since the last sync-mode cast or jarring hit. */
  readonly sinceStrainS: number;
  /** Product of passive bonuses to decay (Titles and gear), 1 when there are none. */
  readonly passiveMult?: number;
}

/** Strain shed per second right now; nothing until the decay delay has passed. */
export function dissonanceDecayPerS(ctx: DecayContext): number {
  assertNonNegative(ctx.sinceStrainS, 'time since the last strain');
  if (ctx.sinceStrainS < K.DIS_DECAY_DELAY) {
    return 0;
  }
  const base = K.DIS_DECAY_BASE + K.DIS_DECAY_WIS * ctx.wis;
  const outOfCombat = ctx.inCombat ? 1 : K.DIS_OOC_DECAY_MULT;
  return base * outOfCombat * (ctx.passiveMult ?? 1);
}

/** The meter after `dtS` seconds of decay. */
export function decayDissonance(current: number, dtS: number, ctx: DecayContext): number {
  assertNonNegative(dtS, 'decay time');
  return applyDissonance(current, -dissonanceDecayPerS(ctx) * dtS);
}

/** Extra damage taken from the distorted band upward. */
export function dissonanceDamageTakenMult(value: number): number {
  return value >= K.DIS_DISTORTED ? 1 + K.DIS_DMG_TAKEN : 1;
}

/**
 * Tags a sync-mode cast resolves with. From the fraying band upward a cast may misfire: its
 * tags become one uniformly random Aspect for counters and resists (cost and power stay).
 * Below that band no random value is drawn.
 */
export function misfireTags(value: number, tags: readonly Aspect[], rng: Rng): readonly Aspect[] {
  if (value < K.DIS_FRAYING || !chance(rng, K.DIS_MISFIRE)) {
    return tags;
  }
  return [pickUniform(rng, ASPECTS)];
}

export interface UnboundOutcome {
  readonly staggerS: number;
  /** True damage; it can kill. */
  readonly hpLoss: number;
  /** The meter's value afterwards. */
  readonly reset: number;
}

export function unboundOutcome(maxHp: number): UnboundOutcome {
  assertNonNegative(maxHp, 'max health');
  return {
    staggerS: K.UNBOUND_STAGGER,
    hpLoss: Math.round(K.UNBOUND_HP * maxHp),
    reset: K.UNBOUND_RESET,
  };
}

export interface StrainResult {
  readonly value: number;
  /** Present when this strain broke loose. */
  readonly unbound?: UnboundOutcome;
}

/** Adds strain; reaching the top of the meter breaks loose and resets it. */
export function addStrain(current: number, delta: number, maxHp: number): StrainResult {
  const value = applyDissonance(current, delta);
  if (value >= K.DIS_MAX) {
    const unbound = unboundOutcome(maxHp);
    return { value: unbound.reset, unbound };
  }
  return { value };
}

/** Strain a jarring hit adds: its amount for a Listener, nothing for anyone else. */
export function jarringStrain(jar: number, victimIsListener: boolean): number {
  assertNonNegative(jar, 'a jarring amount');
  return victimIsListener ? jar : 0;
}
