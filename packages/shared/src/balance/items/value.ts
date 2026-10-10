/** Coin value of equipment, and what vendors pay for items. */
import type { Rarity } from '../../types/items.js';
import { K, RARITY_TABLE } from '../constants.js';
import { assertInRange, assertNonNegative, assertWhole } from '../guards.js';

/** Value of a piece of equipment, rounded to whole coins. */
export function equipmentValue(ilvl: number, rarity: Rarity, upgrade: number): number {
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  assertInRange(upgrade, 0, K.UPGRADE_MAX, 'upgrade level');
  const mult = RARITY_TABLE[rarity].valueMult;
  return Math.round(K.VALUE_BASE * ilvl * mult * (1 + K.VALUE_PER_UPGRADE * upgrade));
}

/** Coins a vendor pays for an item of the given value. */
export function vendorBuyPrice(value: number): number {
  assertNonNegative(value, 'item value');
  return Math.floor(K.VENDOR_BUY_FRAC * value);
}
