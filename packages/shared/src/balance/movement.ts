/**
 * Stamina, dash and guard rules. The movement simulation calls these, and so do the server's
 * combat systems, so each rule has exactly one implementation.
 */
import type { EncumbranceTier } from '../types/combat.js';
import { K } from './constants.js';
import { encumbranceDashCostMult } from './encumbrance.js';
import { MS_PER_S } from '../time/clock-constants.js';
import { assertNonNegative } from './guards.js';

const HALF_TURN_DEG = 180;
const FULL_TURN_DEG = 360;

/** Stamina regenerated per second once regeneration is allowed. */
export function staminaRegenPerS(agi: number): number {
  return K.STA_REGEN + K.STA_REGEN_PER_AGI * agi;
}

/** Stamina regenerated per second right now: none while guarding or soon after spending. */
export function currentStaminaRegenPerS(
  agi: number,
  sinceSpendS: number,
  guarding: boolean,
): number {
  assertNonNegative(sinceSpendS, 'time since stamina was spent');
  if (guarding || sinceSpendS < K.STA_DELAY) {
    return 0;
  }
  return staminaRegenPerS(agi);
}

/** Stamina a dash costs before any load penalty. */
export function baseDashCost(agi: number): number {
  return Math.max(K.DASH_COST_MIN, K.DASH_COST_BASE - K.DASH_COST_PER_AGI * agi);
}

/** Stamina a dash costs under the given load, or null when the load forbids dashing. */
export function dashCost(agi: number, tier: EncumbranceTier): number | null {
  const mult = encumbranceDashCostMult(tier);
  return mult === null ? null : baseDashCost(agi) * mult;
}

/** Dash cost as the movement simulation takes it: infinite when dashing is not allowed. */
export function dashCostParam(agi: number, tier: EncumbranceTier): number {
  return dashCost(agi, tier) ?? Number.POSITIVE_INFINITY;
}

/** Dash speed in px/s: its distance covered over its duration. */
export function dashSpeedPxS(): number {
  return K.DASH_DISTANCE_PX / K.DASH_DURATION_S;
}

/** Dash timings in milliseconds, as the simulation counts them. */
export interface DashTimings {
  readonly durationMs: number;
  readonly cooldownMs: number;
  readonly iframeMs: number;
  /** Stamina regeneration pause after the dash. */
  readonly staminaDelayMs: number;
}

export function dashTimings(): DashTimings {
  return {
    durationMs: K.DASH_DURATION_S * MS_PER_S,
    cooldownMs: K.DASH_COOLDOWN_S * MS_PER_S,
    iframeMs: K.DASH_IFRAME_S * MS_PER_S,
    staminaDelayMs: K.STA_DELAY * MS_PER_S,
  };
}

/** Whether a dash that started `sinceStartS` ago still makes its user immune to hits. */
export function dashInvulnerable(sinceStartS: number): boolean {
  return sinceStartS >= 0 && sinceStartS < K.DASH_IFRAME_S;
}

/** What the character is doing, as far as its move speed is concerned. */
export type ActionPhase = 'none' | 'guard' | 'bow_draw' | 'windup' | 'active' | 'recovery';

/**
 * Move speed multiplier of an action phase. Attack and ability data may give their own
 * multiplier for a phase, which then replaces the default.
 */
export function actionMoveMult(phase: ActionPhase, dataMult?: number): number {
  if (dataMult !== undefined) {
    assertNonNegative(dataMult, 'a move multiplier');
    return dataMult;
  }
  switch (phase) {
    case 'none':
      return 1;
    case 'guard':
      return K.GUARD_MOVE_MULT;
    case 'bow_draw':
      return K.BOW_DRAW_MOVE_MULT;
    case 'windup':
    case 'active':
      return K.ACTION_MOVE_MULT;
    case 'recovery':
      return K.ACTION_RECOVERY_MOVE_MULT;
  }
}

/** Damage multiplier of a blocked hit. */
export function blockDamageMult(hasShield: boolean): number {
  return hasShield ? K.BLOCK_SHIELD_DMG_MULT : K.BLOCK_DMG_MULT;
}

/** Stamina one blocked hit drains: a flat part plus a share of the hit against max health. */
export function blockStaminaCost(rawDamage: number, maxHp: number, hasShield: boolean): number {
  assertNonNegative(rawDamage, 'raw damage');
  if (!(maxHp > 0)) {
    throw new RangeError(`max health must be positive, got ${maxHp}`);
  }
  const cost = K.BLOCK_HIT_BASE + (K.BLOCK_HIT_RAW * rawDamage) / maxHp;
  return hasShield ? cost * K.BLOCK_SHIELD_STA_MULT : cost;
}

/** Stamina that holding the guard drains over `seconds`. */
export function blockHoldDrain(seconds: number): number {
  assertNonNegative(seconds, 'guard hold time');
  return K.BLOCK_DRAIN_PER_S * seconds;
}

/** Whether an attack from `relativeDeg` degrees off the facing direction hits the guard. */
export function isInBlockArc(relativeDeg: number): boolean {
  const turns = (relativeDeg + HALF_TURN_DEG) % FULL_TURN_DEG;
  const wrapped = ((turns + FULL_TURN_DEG) % FULL_TURN_DEG) - HALF_TURN_DEG;
  return Math.abs(wrapped) <= K.BLOCK_ARC_DEG / 2;
}

export interface BlockedHitResult {
  readonly damageMult: number;
  readonly stamina: number;
  /** True when this hit emptied stamina and broke the guard. */
  readonly guardBreak: boolean;
  /** Stun the guard break inflicts, in seconds; 0 when the guard holds. */
  readonly stunS: number;
}

/**
 * Resolves one blocked hit. The hit that empties stamina is still blocked, and it breaks the
 * guard, stunning the defender.
 */
export function resolveBlockedHit(
  stamina: number,
  rawDamage: number,
  maxHp: number,
  hasShield: boolean,
): BlockedHitResult {
  assertNonNegative(stamina, 'stamina');
  const left = stamina - blockStaminaCost(rawDamage, maxHp, hasShield);
  const guardBreak = left <= 0;
  return {
    damageMult: blockDamageMult(hasShield),
    stamina: Math.max(0, left),
    guardBreak,
    stunS: guardBreak ? K.GUARD_BREAK_STUN_S : 0,
  };
}

export type ParryOutcome =
  | {
      readonly kind: 'parry';
      readonly damage: 0;
      readonly attackerStaggerS: number;
      readonly attackerExposedS: number;
      /** Parrying never gives Mana back. */
      readonly manaRefund: 0;
    }
  | { readonly kind: 'block' };

/** A hit landing `sincePressS` after the parry press is parried inside the window, else blocked. */
export function parryOutcome(sincePressS: number): ParryOutcome {
  assertNonNegative(sincePressS, 'time since the parry press');
  if (sincePressS <= K.PARRY_WINDOW_S) {
    return {
      kind: 'parry',
      damage: 0,
      attackerStaggerS: K.PARRY_STAGGER_S,
      attackerExposedS: K.PARRY_EXPOSED_S,
      manaRefund: 0,
    };
  }
  return { kind: 'block' };
}
