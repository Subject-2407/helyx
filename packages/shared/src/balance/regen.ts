/**
 * Combat state and what it gates: health and mana regeneration, loadout and Title changes,
 * and how long a character lingers in the world after logging out.
 *
 * Elapsed times are seconds since the character last dealt or took damage, measured by the
 * caller's injected clock; pass `NEVER_DAMAGED` for a character that has not fought.
 */

/**
 * Tuning values for regeneration and combat state. They mirror the shared balance table key
 * for key and move there once that table exists; nothing outside this module should import them.
 */
const REGEN_K = Object.freeze({
  /** A character is in combat while it dealt or took damage this recently. */
  COMBAT_WINDOW_S: 6,
  HP_REGEN_COMBAT_PER_VIT: 0.05,
  HP_REGEN_OOC_MAXHP: 0.02,
  MANA_REGEN_BASE: 0.5,
  MANA_REGEN_PER_WIS: 0.1,
  MANA_REGEN_OOC_MULT: 3,
} as const);

/**
 * Logout linger timings. They mirror the shared network table key for key and move there once
 * that table exists. The linger window is separate from, and longer than, the combat window.
 */
const LINGER = Object.freeze({
  LINGER_S: 30,
  LINGER_COMBAT_S: 60,
  LINGER_COMBAT_WINDOW_S: 10,
} as const);

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
  return lastDamageAgoS < REGEN_K.COMBAT_WINDOW_S;
}

/** Loadout and Title changes are only allowed out of combat. */
export function canChangeLoadoutOrTitle(lastDamageAgoS: number): boolean {
  return !isInCombat(lastDamageAgoS);
}

/** Health regenerated per second: from vitality in combat, from max health out of it. */
export function hpRegenPerS(inCombat: boolean, vit: number, maxHp: number): number {
  return inCombat ? REGEN_K.HP_REGEN_COMBAT_PER_VIT * vit : REGEN_K.HP_REGEN_OOC_MAXHP * maxHp;
}

/** Mana regenerated per second; out of combat it is multiplied. */
export function manaRegenPerS(inCombat: boolean, wis: number): number {
  const base = REGEN_K.MANA_REGEN_BASE + REGEN_K.MANA_REGEN_PER_WIS * wis;
  return inCombat ? base : base * REGEN_K.MANA_REGEN_OOC_MULT;
}

/**
 * Seconds a character stays in the world after logging out or disconnecting. Outside Safe
 * zones it lingers, longer if it dealt or took damage within the linger window.
 */
export function logoutLingerS(lastDamageAgoS: number, inSafeZone: boolean): number {
  assertElapsed(lastDamageAgoS);
  if (inSafeZone) return NO_LINGER_S;
  return lastDamageAgoS < LINGER.LINGER_COMBAT_WINDOW_S ? LINGER.LINGER_COMBAT_S : LINGER.LINGER_S;
}
