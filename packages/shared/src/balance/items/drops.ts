/**
 * Equipment and essence drops. Per-archetype drop chances and rarity weight tables are content
 * data; these rules take them as inputs.
 */
import { chance, pickWeighted, randInt } from '../../rng/random.js';
import type { Rng } from '../../rng/rng.js';
import { RARITIES, type Rarity } from '../../types/items.js';
import { K } from '../constants.js';
import { assertWhole } from '../guards.js';

/** How a kill decides its equipment drop count. */
export type DropSource =
  | { readonly kind: 'normal'; readonly chance: number }
  | { readonly kind: 'elite' }
  | { readonly kind: 'world_boss'; readonly eligibleGroups: number }
  | { readonly kind: 'instance_boss'; readonly partySize: number };

/** Equipment items a kill drops. Only normal and elite kills draw random values. */
export function equipmentDropCount(source: DropSource, rng: Rng): number {
  switch (source.kind) {
    case 'normal':
      return chance(rng, source.chance) ? 1 : 0;
    case 'elite':
      return 1 + (chance(rng, K.DROP_ELITE_SECOND) ? 1 : 0);
    case 'world_boss':
      assertWhole(source.eligibleGroups, 0, 'eligible group count');
      return Math.min(K.DROP_WORLD_BOSS_MAX, K.DROP_WORLD_BOSS_BASE + source.eligibleGroups);
    case 'instance_boss':
      assertWhole(source.partySize, 1, 'party size');
      return K.DROP_INSTANCE_BOSS_BASE + source.partySize;
  }
}

/** Item level of a drop: the monster's level give or take one, never below the minimum. */
export function rollItemLevel(monsterLevel: number, rng: Rng): number {
  assertWhole(monsterLevel, K.LEVEL_MIN, 'monster level');
  const spread = randInt(rng, -K.DROP_ILVL_SPREAD, K.DROP_ILVL_SPREAD);
  return Math.max(K.ILVL_MIN, monsterLevel + spread);
}

/** A rarity from a table of relative weights, one per rarity in order. */
export function rollRarity(weights: readonly number[], rng: Rng): Rarity {
  if (weights.length !== RARITIES.length) {
    throw new RangeError(`a rarity table needs ${RARITIES.length} weights, got ${weights.length}`);
  }
  return pickWeighted(rng, weights) as Rarity;
}

/**
 * Named uniques start at legendary. A rolled unique rarity with no eligible unique for the
 * source drops one tier at a time until one is eligible or the rarity is no longer unique.
 */
export function downgradeIfNoUnique(
  rarity: Rarity,
  hasEligibleUnique: (rarity: Rarity) => boolean,
): Rarity {
  let current = rarity;
  while (current >= K.UNIQUE_MIN_RARITY && !hasEligibleUnique(current)) {
    current = (current - 1) as Rarity;
  }
  return current;
}

/** Kill class as far as Aspect essences are concerned. */
export type EssenceClass = 'normal' | 'elite' | 'boss';

/** Essences of its primary Aspect a monster drops; monsters without one drop none. */
export function essenceDrop(cls: EssenceClass, hasPrimary: boolean, rng: Rng): number {
  if (!hasPrimary) return 0;
  switch (cls) {
    case 'normal':
      return chance(rng, K.ESSENCE_CHANCE) ? 1 : 0;
    case 'elite':
      return chance(rng, K.ESSENCE_ELITE_CHANCE) ? 1 : 0;
    case 'boss':
      return chance(rng, K.ESSENCE_BOSS_CHANCE) ? K.ESSENCE_BOSS_COUNT : 0;
  }
}
