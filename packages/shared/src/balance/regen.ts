/**
 * Combat state and what it gates: health and mana regeneration, loadout and Title changes,
 * and how long a character lingers in the world after logging out.
 *
 * Elapsed times are seconds since the character last dealt or took damage, measured by the
 * caller's injected clock; pass `NEVER_DAMAGED` for a character that has not fought.
 */

import { NET } from '../net-constants.js';
import { K } from './constants.js';

/** Elapsed time to pass for a character that has never dealt or taken damage. */
export const NEVER_DAMAGED = Number.POSITIVE_INFINITY;

/** Characters in Safe zones leave the world at once instead of lingering. */
const NO_LINGER_S = 0;

function assertElapsed(lastDamageAgoS: number): void {
  if (!(lastDamageAgoS >= 0)) {
    throw new RangeError(`time since last damage must not be negative, got ${lastDamageAgoS}`);
  }
}

/** True while the character dealt or took damage within the combat window. */
export function isInCombat(lastDamageAgoS: number): boolean {
  assertElapsed(lastDamageAgoS);
  return lastDamageAgoS < K.COMBAT_WINDOW_S;
}

/** Loadout and Title changes are only allowed out of combat. */
export function canChangeLoadoutOrTitle(lastDamageAgoS: number): boolean {
  return !isInCombat(lastDamageAgoS);
}

/** Health regenerated per second: from vitality in combat, from max health out of it. */
export function hpRegenPerS(inCombat: boolean, vit: number, maxHp: number): number {
  return inCombat ? K.HP_REGEN_COMBAT_PER_VIT * vit : K.HP_REGEN_OOC_MAXHP * maxHp;
}

/** Mana regenerated per second; out of combat it is multiplied. */
export function manaRegenPerS(inCombat: boolean, wis: number): number {
  const base = K.MANA_REGEN_BASE + K.MANA_REGEN_PER_WIS * wis;
  return inCombat ? base : base * K.MANA_REGEN_OOC_MULT;
}

/**
 * Seconds a character stays in the world after logging out or disconnecting. Outside Safe
 * zones it lingers, longer if it dealt or took damage within the linger window.
 */
export function logoutLingerS(lastDamageAgoS: number, inSafeZone: boolean): number {
  assertElapsed(lastDamageAgoS);
  if (inSafeZone) return NO_LINGER_S;
  return lastDamageAgoS < NET.LINGER_COMBAT_WINDOW_S ? NET.LINGER_COMBAT_S : NET.LINGER_S;
}
