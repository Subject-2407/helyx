/**
 * Monster stat templates: every monster's numbers follow from its level and archetype, scaled
 * up for world bosses by the crowd around them and for instance bosses by the party size.
 */
import { chance, randInt } from '../rng/random.js';
import type { Rng } from '../rng/rng.js';
import type { Archetype } from '../types/combat.js';
import { ARCHETYPE_TABLE, K } from './constants.js';
import { assertWhole } from './guards.js';
import { clamp } from './math.js';
import { xpToNext } from './leveling.js';

export interface MonsterStats {
  readonly hp: number;
  /** Damage of one standard hit before mitigation. */
  readonly atk: number;
  readonly def: number;
  /** Move speed in px/s. */
  readonly speed: number;
  readonly xp: number;
  /** Poise; per phase for bosses. */
  readonly poise: number;
}

export function monsterHp(level: number, archetype: Archetype): number {
  assertWhole(level, K.LEVEL_MIN, 'monster level');
  return Math.round(K.MON_HP_BASE * level ** K.MON_HP_EXP * ARCHETYPE_TABLE[archetype].hp);
}

export function monsterAtk(level: number, archetype: Archetype): number {
  assertWhole(level, K.LEVEL_MIN, 'monster level');
  return Math.round(
    (K.MON_ATK_BASE + K.MON_ATK_PER_LEVEL * level) * ARCHETYPE_TABLE[archetype].atk,
  );
}

export function monsterDef(level: number, archetype: Archetype): number {
  assertWhole(level, K.LEVEL_MIN, 'monster level');
  return Math.round(
    (K.MON_DEF_BASE + K.MON_DEF_PER_LEVEL * level) * ARCHETYPE_TABLE[archetype].def,
  );
}

/** Experience a kill is worth before level difference and sharing. */
export function monsterXp(level: number, archetype: Archetype): number {
  const divisor = K.MON_XP_DIV_BASE + K.MON_XP_DIV_PER_LEVEL * level;
  return Math.floor((xpToNext(level) / divisor) * ARCHETYPE_TABLE[archetype].xp);
}

/** The full template of a monster at a level. */
export function monsterStats(level: number, archetype: Archetype): MonsterStats {
  const row = ARCHETYPE_TABLE[archetype];
  return {
    hp: monsterHp(level, archetype),
    atk: monsterAtk(level, archetype),
    def: monsterDef(level, archetype),
    speed: row.speed,
    xp: monsterXp(level, archetype),
    poise: row.poise,
  };
}

/**
 * Coins a kill drops, 0 when it drops none. The drop roll comes first; the amount is only
 * rolled when coins drop.
 */
export function monsterCoins(level: number, archetype: Archetype, rng: Rng): number {
  assertWhole(level, K.LEVEL_MIN, 'monster level');
  if (!chance(rng, K.MON_COIN_CHANCE)) {
    return 0;
  }
  const base = randInt(rng, K.MON_COIN_MIN, K.MON_COIN_MAX);
  return Math.round(base * (1 + K.MON_COIN_PER_LEVEL * level) * ARCHETYPE_TABLE[archetype].coin);
}

/** World boss health multiplier for the players nearby, counted between 1 and 20. */
export function worldBossHpMult(playersNearby: number): number {
  const n = clamp(Math.floor(playersNearby), K.WORLD_BOSS_MIN_PLAYERS, K.WORLD_BOSS_MAX_PLAYERS);
  return 1 + K.WORLD_BOSS_HP_PER_PLAYER * (n - 1);
}

/** Instance boss health multiplier for the party size; attack is not scaled. */
export function instanceHpMult(partySize: number): number {
  assertWhole(partySize, 1, 'party size');
  return 1 + K.INSTANCE_HP_PER_MEMBER * (partySize - 1);
}
