/** Enchanting: giving an item an Aspect identity. It always succeeds and overwrites. */
import type { Aspect } from '../../types/aspect.js';
import type { EnchantGrade } from '../../types/items.js';
import { ENCHANT_GRADES, K } from '../constants.js';
import { assertWhole } from '../guards.js';

export interface Enchant {
  readonly aspect: Aspect;
  readonly grade: EnchantGrade;
}

export interface EnchantCost {
  readonly essences: number;
  readonly coins: number;
  /** Enchanting level the enchanter needs. */
  readonly level: number;
}

export function enchantCost(grade: EnchantGrade, ilvl: number): EnchantCost {
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  const row = ENCHANT_GRADES[grade];
  return { essences: row.essences, coins: row.coinPerIlvl * ilvl, level: row.level };
}

export function canEnchant(grade: EnchantGrade, enchantingLevel: number): boolean {
  return enchantingLevel >= ENCHANT_GRADES[grade].level;
}

/**
 * What an enchant does: on a weapon, the tagged portion of its basic attacks; anywhere else,
 * resist against the Aspect.
 */
export function enchantEffect(grade: EnchantGrade, onWeapon: boolean): number {
  const row = ENCHANT_GRADES[grade];
  return onWeapon ? row.p : row.resist;
}

/** One enchant per item: a new one simply replaces the old. */
export function applyEnchant(_current: Enchant | undefined, next: Enchant): Enchant {
  return next;
}
