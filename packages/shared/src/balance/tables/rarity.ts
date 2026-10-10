import type { Rarity } from '../../types/items.js';

/** What a rarity grants an item. */
export interface RarityRow {
  /** Random affix lines. */
  readonly affixes: number;
  /** Fixed unique traits (named uniques only). */
  readonly traits: number;
  /** Lowest affix quality a roll can land on. */
  readonly rollFloor: number;
  /** Highest upgrade level the item can reach. */
  readonly upgradeMax: number;
  readonly socketMin: number;
  readonly socketMax: number;
  /** Multiplier on the base's stats. */
  readonly baseStatMult: number;
  readonly maxDurability: number;
  /** Multiplier on the item's coin value. */
  readonly valueMult: number;
}

function row(
  affixes: number,
  traits: number,
  rollFloor: number,
  upgradeMax: number,
  sockets: readonly [number, number],
  baseStatMult: number,
  maxDurability: number,
  valueMult: number,
): RarityRow {
  const [socketMin, socketMax] = sockets;
  return {
    affixes,
    traits,
    rollFloor,
    upgradeMax,
    socketMin,
    socketMax,
    baseStatMult,
    maxDurability,
    valueMult,
  };
}

/** One row per rarity, common (0) to celestial (9). */
export const RARITY_TABLE: Readonly<Record<Rarity, RarityRow>> = Object.freeze({
  0: row(0, 0, 0, 5, [0, 0], 1, 60, 1),
  1: row(1, 0, 0, 6, [0, 1], 1.08, 70, 2),
  2: row(2, 0, 0, 8, [0, 1], 1.16, 80, 4),
  3: row(2, 0, 0.25, 9, [0, 2], 1.24, 90, 6),
  4: row(3, 0, 0.25, 10, [1, 2], 1.33, 100, 10),
  5: row(3, 1, 0.35, 12, [1, 2], 1.45, 110, 20),
  6: row(4, 1, 0.45, 13, [1, 3], 1.58, 120, 40),
  7: row(4, 1, 0.55, 14, [2, 3], 1.72, 130, 80),
  8: row(5, 1, 0.65, 15, [2, 3], 1.87, 140, 160),
  9: row(5, 2, 0.75, 15, [3, 3], 2, 150, 320),
});
