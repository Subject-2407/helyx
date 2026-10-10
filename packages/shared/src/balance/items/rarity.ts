/** What a rarity grants an item, and the socket count rolled when an item is made. */
import { randInt } from '../../rng/random.js';
import type { Rng } from '../../rng/rng.js';
import type { Rarity } from '../../types/items.js';
import { RARITY_TABLE, type RarityRow } from '../constants.js';

export function rarityRow(rarity: Rarity): RarityRow {
  return RARITY_TABLE[rarity];
}

/** Sockets an item of the rarity gets, uniform within the rarity's range. */
export function rollSocketCount(rarity: Rarity, rng: Rng): number {
  const row = rarityRow(rarity);
  return randInt(rng, row.socketMin, row.socketMax);
}
