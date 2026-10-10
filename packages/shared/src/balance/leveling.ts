/**
 * Character leveling: experience curve, stat points, the level cap raised by Thresholds, and
 * the guideline amounts of experience that quests, bounties, discovery and professions give.
 */

import { K } from './constants.js';
import { assertWhole } from './guards.js';

/** Level progress of one character. `levelCap` is stored per character and rises by Threshold. */
export interface LevelState {
  readonly level: number;
  /** Progress toward the next level; always below `xpToNext(level)`, and 0 at the cap. */
  readonly xp: number;
  readonly levelCap: number;
}

export interface AddXpResult {
  readonly state: LevelState;
  readonly levelsGained: number;
  readonly statPointsGained: number;
  /** Experience thrown away because the character reached the cap. */
  readonly discardedXp: number;
}

export interface XpRange {
  readonly min: number;
  readonly max: number;
}

/** Experience needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  assertWhole(level, K.LEVEL_MIN, 'level');
  return Math.floor(K.XP_A * Math.pow(level, K.XP_EXP));
}

/** Stat points granted on reaching `level`; the starting level grants none. */
export function statPointsForLevel(level: number): number {
  assertWhole(level, K.LEVEL_MIN, 'level');
  if (level === K.LEVEL_MIN) return 0;
  const bonus = level % K.STAT_POINTS_BONUS_EVERY === 0 ? K.STAT_POINTS_BONUS : 0;
  return K.STAT_POINTS_PER_LEVEL + bonus;
}

/** The level cap after the given number of passed Threshold Trials. */
export function levelCap(thresholds: number): number {
  assertWhole(thresholds, 0, 'threshold count');
  return K.LEVEL_CAP_BASE + K.THRESHOLD_STEP * thresholds;
}

function assertState(state: LevelState): void {
  assertWhole(state.levelCap, K.LEVEL_MIN, 'level cap');
  assertWhole(state.level, K.LEVEL_MIN, 'level');
  if (state.level > state.levelCap) {
    throw new RangeError(`level ${state.level} is above the cap ${state.levelCap}`);
  }
  const limit = state.level === state.levelCap ? 1 : xpToNext(state.level);
  if (!Number.isInteger(state.xp) || state.xp < 0 || state.xp >= limit) {
    throw new RangeError(`progress ${state.xp} does not fit level ${state.level}`);
  }
}

/**
 * Adds experience, leveling up as many times as it pays for. At the cap all further
 * experience is discarded and progress stays at 0. Returns a new state.
 */
export function addXp(state: LevelState, xp: number): AddXpResult {
  assertState(state);
  assertWhole(xp, 0, 'experience');
  let { level } = state;
  let pool = state.xp + xp;
  let statPointsGained = 0;
  while (level < state.levelCap && pool >= xpToNext(level)) {
    pool -= xpToNext(level);
    level += 1;
    statPointsGained += statPointsForLevel(level);
  }
  const atCap = level === state.levelCap;
  return {
    state: { level, xp: atCap ? 0 : pool, levelCap: state.levelCap },
    levelsGained: level - state.level,
    statPointsGained,
    discardedXp: atCap ? pool : 0,
  };
}

function fractionOfLevel(level: number, fraction: number): number {
  return Math.round(fraction * xpToNext(level));
}

/** Guideline experience for one main quest step at the given level. */
export function mainQuestXpRange(level: number): XpRange {
  return {
    min: fractionOfLevel(level, K.MAIN_QUEST_XP_MIN),
    max: fractionOfLevel(level, K.MAIN_QUEST_XP_MAX),
  };
}

/** Guideline experience for a side quest at the given level. */
export function sideQuestXpRange(level: number): XpRange {
  return {
    min: fractionOfLevel(level, K.SIDE_QUEST_XP_MIN),
    max: fractionOfLevel(level, K.SIDE_QUEST_XP_MAX),
  };
}

/** Guideline experience for a bounty at the given level. */
export function bountyXp(level: number): number {
  return fractionOfLevel(level, K.BOUNTY_XP);
}

/** Experience for discovering a new named zone at the given level. */
export function discoveryXp(level: number): number {
  return fractionOfLevel(level, K.DISCOVERY_XP);
}

/** Character experience for one gather from a node of the given level. */
export function gatherCharacterXp(nodeLevel: number): number {
  assertWhole(nodeLevel, 0, 'node level');
  return K.GATHER_CHAR_XP_BASE + nodeLevel;
}

/** Character experience for one craft of a recipe of the given level. */
export function craftCharacterXp(recipeLevel: number): number {
  assertWhole(recipeLevel, 0, 'recipe level');
  return K.CRAFT_CHAR_XP_BASE + recipeLevel;
}
