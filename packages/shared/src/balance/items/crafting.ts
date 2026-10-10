/**
 * Crafting and gathering. The crafted-rarity table is content data passed in; masterwork,
 * profession experience and gathering yield are rules.
 */
import { chance, pickWeighted } from '../../rng/random.js';
import type { Rng } from '../../rng/rng.js';
import type { Rarity } from '../../types/items.js';
import { K } from '../constants.js';
import { assertNonNegative, assertWhole } from '../guards.js';

/** One row of the crafted-rarity table: relative weights from common upward. */
export interface CraftedRarityRow {
  /** Lowest mastery margin (profession level minus recipe level) the row applies to. */
  readonly minMargin: number;
  readonly weights: readonly number[];
}

/** The row for a mastery margin: the one with the highest minimum the margin reaches. */
export function craftedRarityRow(
  margin: number,
  table: readonly CraftedRarityRow[],
): CraftedRarityRow {
  let best: CraftedRarityRow | undefined;
  for (const row of table) {
    if (margin >= row.minMargin && (best === undefined || row.minMargin > best.minMargin)) {
      best = row;
    }
  }
  if (best === undefined) {
    throw new RangeError(`no crafted rarity row covers a margin of ${margin}`);
  }
  return best;
}

/** Chance that a craft comes out one rarity higher. */
export function masterworkChance(professionLevel: number): number {
  assertNonNegative(professionLevel, 'profession level');
  return Math.min(K.MASTERWORK_CAP, K.MASTERWORK_BASE + K.MASTERWORK_PER_LEVEL * professionLevel);
}

/** Rolls a crafted item's rarity, then its masterwork chance; never above the crafting maximum. */
export function rollCraftedRarity(
  margin: number,
  table: readonly CraftedRarityRow[],
  professionLevel: number,
  rng: Rng,
): Rarity {
  const base = pickWeighted(rng, craftedRarityRow(margin, table).weights);
  const raised = chance(rng, masterworkChance(professionLevel)) ? base + 1 : base;
  return Math.min(raised, K.CRAFT_MAX_RARITY) as Rarity;
}

/** Profession experience to go from level `l` to the next. */
export function professionXpToNext(level: number): number {
  assertWhole(level, 1, 'profession level');
  return Math.floor(K.PROFESSION_XP_BASE * level ** K.PROFESSION_XP_EXP);
}

/** Profession experience a craft (or gather) grants, less when the recipe is far below the crafter. */
export function craftXp(recipeXp: number, margin: number): number {
  assertNonNegative(recipeXp, 'recipe experience');
  if (margin >= K.PROFESSION_CRAFT_XP_HIGH_MARGIN) return recipeXp * K.PROFESSION_CRAFT_XP_HIGH;
  if (margin >= K.PROFESSION_CRAFT_XP_MID_MARGIN) return recipeXp * K.PROFESSION_CRAFT_XP_MID;
  return recipeXp;
}

/** Items one gather yields at a profession level, sometimes one more. */
export function gatherYield(professionLevel: number, rng: Rng): number {
  assertWhole(professionLevel, 0, 'profession level');
  const base = 1 + Math.floor(professionLevel / K.PROFESSION_YIELD_STEP);
  return base + (chance(rng, K.PROFESSION_YIELD_BONUS_CHANCE) ? K.PROFESSION_YIELD_BONUS : 0);
}
