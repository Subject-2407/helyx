/**
 * Poise: every damaging hit wears it down, and a character whose poise breaks is staggered.
 * Poise comes back in full once the character has gone long enough without poise damage.
 */

import type { Archetype } from '../../types/combat.js';
import { ARCHETYPE_TABLE, K } from '../constants.js';
import { assertInRange } from '../guards.js';

/** Player poise: a fixed base plus what the body armor adds. */
export function playerPoise(bodyArmorPoise: number): number {
  assertInRange(bodyArmorPoise, 0, K.POISE_BODY_ARMOR_MAX, 'body armor poise');
  return K.POISE_PLAYER_BASE + bodyArmorPoise;
}

/** Poise of a monster archetype (per phase for bosses). */
export function archetypePoise(archetype: Archetype): number {
  return ARCHETYPE_TABLE[archetype].poise;
}

/** Seconds without poise damage before poise refills; bosses wait longer. */
export function poiseRegenDelayS(isBoss: boolean): number {
  return isBoss ? K.POISE_BOSS_REGEN_DELAY_S : K.POISE_REGEN_DELAY_S;
}

export interface PoiseState {
  readonly current: number;
  readonly max: number;
  /** When poise damage last landed, in seconds; `undefined` if never. */
  readonly lastDamageS?: number;
}

export interface PoiseHitResult {
  readonly state: PoiseState;
  /** True when this hit broke poise and the target is staggered. */
  readonly broken: boolean;
}

/**
 * Applies poise damage. A break refills poise at once, so the next stagger needs a full bar of
 * poise damage again instead of every following hit staggering.
 */
export function applyPoiseDamage(state: PoiseState, amount: number, nowS: number): PoiseHitResult {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`poise damage must be zero or more, got ${amount}`);
  }
  const left = state.current - amount;
  if (left <= 0 && amount > 0) {
    return { state: { current: state.max, max: state.max, lastDamageS: nowS }, broken: true };
  }
  return { state: { current: left, max: state.max, lastDamageS: nowS }, broken: false };
}

/** Refills poise once the regen delay has passed since the last poise damage. */
export function regenPoise(state: PoiseState, nowS: number, isBoss: boolean): PoiseState {
  if (state.lastDamageS === undefined || state.current >= state.max) {
    return state;
  }
  if (nowS - state.lastDamageS < poiseRegenDelayS(isBoss)) {
    return state;
  }
  return { current: state.max, max: state.max, lastDamageS: state.lastDamageS };
}
