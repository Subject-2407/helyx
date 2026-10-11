/**
 * The public balance numbers of the game, in one flat frozen table keyed by name. Gameplay code
 * reads its numbers from here (never inline), and content refers to a constant by its key, so the
 * keys are stable and the table stays flat. Tune a value here and update its golden test in the
 * same change.
 *
 * The groups live in `constants/` only to keep files small; rule tables (rows rather than single
 * numbers) live in `tables/` and are re-exported from here. Numbers that only hidden rules read
 * sit in a separate table behind their own entry point, and no key appears in both.
 */
import { CHARACTER_K } from './constants/character.js';
import { COMBAT_K } from './constants/combat.js';
import { ITEMS_K } from './constants/items.js';
import { REVIVAL_K } from './constants/revival.js';
import { WORLD_K } from './constants/world.js';

export const K = Object.freeze({
  ...CHARACTER_K,
  ...COMBAT_K,
  ...WORLD_K,
  ...REVIVAL_K,
  ...ITEMS_K,
} as const);

export type KKey = keyof typeof K;

/** Whether `key` names a public balance constant, for data that refers to constants by key. */
export function isKKey(key: string): key is KKey {
  return Object.hasOwn(K, key);
}

export * from './tables/index.js';
