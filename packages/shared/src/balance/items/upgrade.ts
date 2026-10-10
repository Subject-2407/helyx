/** Upgrading an item's base power at an anvil: chances, failures, costs and the stat gain. */
import type { Rarity } from '../../types/items.js';
import { K, RARITY_TABLE, SHARD_TIERS, UPGRADE_TABLE, type UpgradeRow } from '../constants.js';
import { assertInRange, assertNonNegative, assertWhole } from '../guards.js';

function upgradeRow(target: number): UpgradeRow {
  assertWhole(target, 1, 'target upgrade level');
  const row = UPGRADE_TABLE[target - 1];
  if (row === undefined) {
    throw new RangeError(`no upgrade step leads to +${target}`);
  }
  return row;
}

/** Success chance of the step to `target`, with the smith's capped bonus. */
export function upgradeChance(target: number, smithingLevel: number): number {
  assertNonNegative(smithingLevel, 'smithing level');
  const bonus = Math.min(K.UPGRADE_SMITHING_CAP, K.UPGRADE_SMITHING_PER_LEVEL * smithingLevel);
  return Math.min(1, upgradeRow(target).chance + bonus);
}

/**
 * Upgrade level after a failed step to `target`. Materials and coins are always lost; from the
 * level-losing steps on the item also drops a level, unless a ward protects it.
 */
export function levelAfterFailure(target: number, hasWard: boolean): number {
  const current = target - 1;
  return upgradeRow(target).onFailure === 'level' && !hasWard ? current - 1 : current;
}

/** Tempering shard used for an item level. */
export function shardFor(ilvl: number): string {
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  const tier = SHARD_TIERS.find((t) => ilvl <= t.maxIlvl);
  // The last tier has no upper bound, so every item level finds one.
  return tier?.shardId ?? '';
}

export interface UpgradeCost {
  readonly shardId: string;
  readonly shards: number;
  readonly coins: number;
}

/** What the step to `target` costs. */
export function upgradeCost(target: number, ilvl: number, rarity: Rarity): UpgradeCost {
  upgradeRow(target);
  const rarityFactor = 1 + K.UPGRADE_RARITY_FACTOR * rarity;
  return {
    shardId: shardFor(ilvl),
    shards: target,
    coins: Math.round(K.UPGRADE_COIN_BASE * ilvl * target * rarityFactor),
  };
}

/** Multiplier on the base stats at an upgrade level: small steps first, larger steps later. */
export function upgradeBaseMult(level: number): number {
  assertInRange(level, 0, K.UPGRADE_MAX, 'upgrade level');
  const low = Math.min(level, K.UPGRADE_LOW_MAX);
  const high = Math.max(0, level - K.UPGRADE_LOW_MAX);
  return 1 + K.UPGRADE_LOW_STEP * low + K.UPGRADE_HIGH_STEP * high;
}

/** Whether an item can take another upgrade step under its rarity's ceiling. */
export function canUpgrade(current: number, rarity: Rarity): boolean {
  return current < RARITY_TABLE[rarity].upgradeMax;
}
