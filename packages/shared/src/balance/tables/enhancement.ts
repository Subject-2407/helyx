import type { EnchantGrade } from '../../types/items.js';

/** What a failed upgrade costs beyond the materials and coins, which are always lost. */
export type UpgradeFailure = 'none' | 'materials' | 'level';

export interface UpgradeRow {
  /** Base success chance before the smithing bonus. */
  readonly chance: number;
  readonly onFailure: UpgradeFailure;
}

/** Upgrade rows by target level: index 0 is the step to +1, index 14 the step to +15. */
export const UPGRADE_TABLE: readonly UpgradeRow[] = Object.freeze([
  { chance: 1, onFailure: 'none' },
  { chance: 1, onFailure: 'none' },
  { chance: 1, onFailure: 'none' },
  { chance: 1, onFailure: 'none' },
  { chance: 1, onFailure: 'none' },
  { chance: 1, onFailure: 'none' },
  { chance: 0.8, onFailure: 'materials' },
  { chance: 0.65, onFailure: 'materials' },
  { chance: 0.5, onFailure: 'level' },
  { chance: 0.4, onFailure: 'level' },
  { chance: 0.35, onFailure: 'level' },
  { chance: 0.3, onFailure: 'level' },
  { chance: 0.25, onFailure: 'level' },
  { chance: 0.2, onFailure: 'level' },
  { chance: 0.15, onFailure: 'level' },
]);

/** Tempering shard used for an item level band; the last band has no upper bound. */
export interface ShardTier {
  /** Highest item level inside the band, inclusive. */
  readonly maxIlvl: number;
  readonly shardId: string;
}

export const SHARD_TIERS: readonly ShardTier[] = Object.freeze([
  { maxIlvl: 20, shardId: 'mat_tempering_shard_dull' },
  { maxIlvl: 40, shardId: 'mat_tempering_shard_keen' },
  { maxIlvl: 60, shardId: 'mat_tempering_shard_bright' },
  { maxIlvl: 80, shardId: 'mat_tempering_shard_radiant' },
  { maxIlvl: Number.POSITIVE_INFINITY, shardId: 'mat_tempering_shard_flawless' },
]);

export interface EnchantGradeRow {
  /** Tagged portion of a weapon's basic attacks. */
  readonly p: number;
  /** Resist an off hand, armor piece or accessory gains against the Aspect. */
  readonly resist: number;
  /** Enchanting level needed. */
  readonly level: number;
  /** Essences of the Aspect consumed. */
  readonly essences: number;
  /** Coins per item level. */
  readonly coinPerIlvl: number;
}

export const ENCHANT_GRADES: Readonly<Record<EnchantGrade, EnchantGradeRow>> = Object.freeze({
  1: { p: 0.2, resist: 0.06, level: 1, essences: 2, coinPerIlvl: 15 },
  2: { p: 0.35, resist: 0.1, level: 10, essences: 5, coinPerIlvl: 30 },
  3: { p: 0.5, resist: 0.15, level: 20, essences: 10, coinPerIlvl: 45 },
});

/** Resonance crystal grades, lowest first. */
export const CRYSTAL_GRADES = Object.freeze([
  'chipped',
  'flawed',
  'clear',
  'flawless',
  'perfect',
] as const);

export type CrystalGrade = (typeof CRYSTAL_GRADES)[number];

/** Effect units each crystal grade carries. */
export const CRYSTAL_UNITS: Readonly<Record<CrystalGrade, number>> = Object.freeze({
  chipped: 1,
  flawed: 2,
  clear: 3,
  flawless: 4.5,
  perfect: 6,
});

/** What a socket's host turns crystal units into. */
export type SocketHost = 'weapon' | 'off_hand' | 'armor' | 'accessory';

/** Effect per crystal unit: damage on weapons, resist on off hands and armor, gain on accessories. */
export const SOCKET_EFFECT_PER_UNIT: Readonly<Record<SocketHost, number>> = Object.freeze({
  weapon: 0.02,
  off_hand: 0.02,
  armor: 0.02,
  accessory: 0.015,
});
