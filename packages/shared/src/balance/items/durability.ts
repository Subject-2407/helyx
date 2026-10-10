/** Wear, breaking and repair of equipment and tools. */
import type { Rarity } from '../../types/items.js';
import { K } from '../constants.js';
import { assertNonNegative, assertWhole } from '../guards.js';

/** Weapons wear from hits landed, armor and off hands from hits taken, tools from gathering. */
export type WearKind = 'weapon' | 'armor' | 'tool';

export interface WearState {
  readonly durability: number;
  /** Hits counted toward the next point of wear. */
  readonly counter: number;
}

export interface WearEvents {
  readonly hits: number;
  /** How many of those hits carried the Entropy tag; they count double. */
  readonly entropyHits?: number;
}

function hitsPerPoint(kind: WearKind): number {
  switch (kind) {
    case 'weapon':
      return K.DUR_WEAPON_HITS;
    case 'armor':
      return K.DUR_ARMOR_HITS;
    case 'tool':
      return K.DUR_TOOL_PER_GATHER;
  }
}

/** Wears an item down; it never goes below 0 and never disappears from wear. */
export function applyWear(state: WearState, kind: WearKind, events: WearEvents): WearState {
  assertWhole(events.hits, 0, 'hit count');
  const entropy = events.entropyHits ?? 0;
  assertWhole(entropy, 0, 'entropy hit count');
  if (entropy > events.hits) {
    throw new RangeError('entropy hits cannot outnumber hits');
  }
  const counted = state.counter + events.hits + entropy * (K.DUR_ENTROPY_MULT - 1);
  const per = hitsPerPoint(kind);
  const lost = Math.floor(counted / per);
  return {
    durability: Math.max(0, state.durability - lost),
    counter: counted - lost * per,
  };
}

/** A broken item keeps its slot and weight but gives no stats or affixes. */
export function isBroken(durability: number): boolean {
  return durability <= 0;
}

/** Coins a smith charges to restore missing durability. */
export function repairCost(missing: number, ilvl: number, rarity: Rarity): number {
  assertNonNegative(missing, 'missing durability');
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  const rarityFactor = 1 + K.REPAIR_RARITY_FACTOR * rarity;
  return Math.ceil(missing * ilvl * rarityFactor * K.REPAIR_FACTOR);
}

/** Durability after a repair kit, never above the maximum. */
export function applyRepairKit(durability: number, maxDurability: number): number {
  return Math.min(maxDurability, durability + K.REPAIR_KIT_AMOUNT);
}
