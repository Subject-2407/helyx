/** Coin sinks: stat reshaping, bank space, clans and market fees. */
import { K } from '../constants.js';
import { assertNonNegative, assertWhole } from '../guards.js';

/** Coins to reshape (respec) the stats of a character at a level. */
export function reshapeCost(level: number): number {
  assertWhole(level, K.LEVEL_MIN, 'level');
  return Math.round(K.RESHAPE_BASE * level ** K.RESHAPE_EXP);
}

/** Number of bank expansions there are, from the starting size to the largest. */
export function bankExpansionCount(): number {
  return (K.BANK_MAX_SLOTS - K.BANK_BASE_SLOTS) / K.BANK_STEP_SLOTS;
}

/** Coins the n-th bank expansion costs; each adds a fixed number of slots. */
export function bankExpansionCost(n: number): number {
  assertWhole(n, 1, 'expansion number');
  if (n > bankExpansionCount()) {
    throw new RangeError(`the bank cannot grow past ${K.BANK_MAX_SLOTS} slots`);
  }
  return K.BANK_COST_BASE * K.BANK_COST_GROWTH ** (n - 1);
}

/** Bank slots after `n` expansions. */
export function bankSlots(n: number): number {
  assertWhole(n, 0, 'expansion count');
  return Math.min(K.BANK_MAX_SLOTS, K.BANK_BASE_SLOTS + K.BANK_STEP_SLOTS * n);
}

export function clanFoundingCost(): number {
  return K.CLAN_FOUNDING_COST;
}

/** Non-refundable fee to list an item on the exchange board. */
export function listingFee(price: number): number {
  assertNonNegative(price, 'price');
  return Math.max(K.LISTING_FEE_MIN, Math.round(K.LISTING_FEE_FRAC * price));
}

/** Tax taken from an exchange board sale. */
export function salesTax(price: number): number {
  assertNonNegative(price, 'price');
  return Math.round(K.SALES_TAX_FRAC * price);
}

/** What a seller receives from an exchange board sale; the listing fee was paid up front. */
export function sellerProceeds(price: number): number {
  return price - salesTax(price);
}

/** Prepaid rent for a market stall. */
export function stallRent(hours: number): number {
  assertWhole(hours, 0, 'rent hours');
  return K.STALL_RENT_PER_H * hours;
}

/** Tax taken from stall sales. */
export function stallTax(total: number): number {
  assertNonNegative(total, 'sales total');
  return Math.round(K.STALL_TAX_FRAC * total);
}
