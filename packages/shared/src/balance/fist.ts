/**
 * The fist style: bare hands as a tier-0 fist weapon when the main hand is empty, fist items in
 * one or both hands, the hands-armor bonus, faster basic attacks, shorter reach and more poise
 * damage, plus which hand combinations and ability requirements are legal.
 */
import type { WeaponCategory } from '../types/items.js';
import { K } from './constants.js';
import { assertNonNegative, assertWhole } from './guards.js';

/** What the main hand holds: a weapon category, or nothing (bare hands). */
export type MainHand = WeaponCategory | null;

/** Weapon attack of the tier-1 sword curve at a character level. */
export function tier1SwordAtk(level: number): number {
  assertWhole(level, K.LEVEL_MIN, 'level');
  return K.TIER1_SWORD_BASE + K.TIER1_SWORD_PER_LEVEL * level;
}

/** Weapon attack of bare hands at a character level. */
export function bareFistAtk(level: number): number {
  return Math.round(K.BARE_ATK_MULT * tier1SwordAtk(level));
}

/** Effective weapon attack of two fist items: the main hand plus half the off hand. */
export function dualFistWeaponAtk(mainAtk: number, offAtk: number): number {
  assertNonNegative(mainAtk, 'main hand attack');
  assertNonNegative(offAtk, 'off hand attack');
  return Math.round(mainAtk + K.FIST_OFFHAND_ATK * offAtk);
}

/**
 * Weapon attack the hands armor adds with a fist main hand (bare hands included): half its
 * defense, unless the item names its own bonus. Any other main hand gets nothing.
 */
export function fistHandsBonus(main: MainHand, handsDef: number, fistBonus?: number): number {
  if (!isFistMainHand(main)) return 0;
  assertNonNegative(handsDef, 'hands armor defense');
  return fistBonus ?? Math.round(K.FIST_HANDS_BONUS * handsDef);
}

/** Basic-attack speed of fist combos: dexterity scaling, the fist factor, then the cap. */
export function fistAttackSpeed(dex: number, affix = 0): number {
  return Math.min(K.ASPD_CAP, (1 + K.ASPD_PER_DEX * dex + affix) * K.FIST_ASPD);
}

export function fistReachPx(): number {
  return K.FIST_RANGE_PX;
}

/** Poise damage of a fist hit from the sword baseline. */
export function fistPoiseDamage(swordPoise: number): number {
  assertNonNegative(swordPoise, 'poise damage');
  return Math.round(swordPoise * K.FIST_POISE_MULT);
}

/** Hits in one basic combo: one more when both hands hold fist items. */
export function fistComboHits(dual: boolean): number {
  return dual ? K.DUAL_FIST_COMBO_HITS : K.FIST_COMBO_HITS;
}

/** Bare hands exist only while the main hand is empty. */
export function isBareHanded(main: MainHand): boolean {
  return main === null;
}

/** A fist main hand: bare hands or a fist item. */
export function isFistMainHand(main: MainHand): boolean {
  return main === null || main === 'fist';
}

/** What the off hand holds; only a fist item, a shield or nothing is ever legal there. */
export type OffHand = WeaponCategory | null;

/**
 * Whether an off hand may go with a main hand. A two-handed main weapon keeps the off hand
 * empty; a fist item in the off hand needs a fist item in the main hand; a shield goes with
 * any one-handed main hand, fists included. Only fists and shields go in the off hand.
 */
export function isOffHandLegal(main: MainHand, mainTwoHanded: boolean, off: OffHand): boolean {
  if (off === null) return true;
  if (mainTwoHanded) return false;
  if (off === 'fist') return main === 'fist';
  return off === 'shield';
}

/** An ability's weapon requirement: anything, or a list of categories. */
export type WeaponRequirement = 'any' | readonly WeaponCategory[];

/** Whether an ability can be used with the main hand; fist abilities accept bare hands. */
export function abilityUsableWith(requirement: WeaponRequirement, main: MainHand): boolean {
  if (requirement === 'any') return true;
  if (main === null) return requirement.includes('fist');
  return requirement.includes(main);
}
