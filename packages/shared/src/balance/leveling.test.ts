import { describe, expect, it } from 'vitest';
import golden from './__golden__/leveling.json' with { type: 'json' };
import {
  addXp,
  bountyXp,
  craftCharacterXp,
  discoveryXp,
  gatherCharacterXp,
  levelCap,
  mainQuestXpRange,
  sideQuestXpRange,
  statPointsForLevel,
  xpToNext,
  type LevelState,
} from './leveling.js';

describe('experience to the next level', () => {
  it.each(golden.xpToNext)('level $level row', ({ level, expected }) => {
    expect(xpToNext(level)).toBe(expected);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects level %s', (level) => {
    expect(() => xpToNext(level)).toThrow(RangeError);
  });
});

describe('stat points per level', () => {
  it.each(golden.statPoints)('level $level row', ({ level, expected }) => {
    expect(statPointsForLevel(level)).toBe(expected);
  });

  it('gives nothing for the starting level', () => {
    expect(statPointsForLevel(1)).toBe(0);
  });
});

describe('level cap', () => {
  it.each(golden.levelCap)('$thresholds thresholds row', ({ thresholds, expected }) => {
    expect(levelCap(thresholds)).toBe(expected);
  });

  it('rejects a negative or fractional threshold count', () => {
    expect(() => levelCap(-1)).toThrow(RangeError);
    expect(() => levelCap(0.5)).toThrow(RangeError);
  });
});

describe('adding experience', () => {
  const fresh: LevelState = { level: 1, xp: 0, levelCap: 100 };

  it('keeps partial progress without leveling', () => {
    const result = addXp(fresh, 79);
    expect(result.state).toEqual({ level: 1, xp: 79, levelCap: 100 });
    expect(result.levelsGained).toBe(0);
    expect(result.statPointsGained).toBe(0);
    expect(result.discardedXp).toBe(0);
  });

  it('levels up exactly at the threshold', () => {
    const result = addXp(fresh, 80);
    expect(result.state).toEqual({ level: 2, xp: 0, levelCap: 100 });
    expect(result.levelsGained).toBe(1);
    expect(result.statPointsGained).toBe(3);
  });

  it('levels up several times from one large gain', () => {
    // 80 + 269 + 547 = 896 reaches level 4, leaving 4 points of progress.
    const result = addXp({ level: 1, xp: 0, levelCap: 100 }, 900);
    expect(result.state).toEqual({ level: 4, xp: 4, levelCap: 100 });
    expect(result.levelsGained).toBe(3);
    expect(result.statPointsGained).toBe(9);
  });

  it('counts the bonus point when crossing a multiple of ten', () => {
    const result = addXp({ level: 9, xp: 0, levelCap: 100 }, xpToNext(9) + xpToNext(10));
    expect(result.state.level).toBe(11);
    expect(result.statPointsGained).toBe(7);
  });

  it('stops at the cap and discards the rest', () => {
    const result = addXp({ level: 99, xp: 10, levelCap: 100 }, xpToNext(99));
    expect(result.state).toEqual({ level: 100, xp: 0, levelCap: 100 });
    expect(result.levelsGained).toBe(1);
    expect(result.statPointsGained).toBe(4);
    expect(result.discardedXp).toBe(10);
  });

  it('discards every point gained at the cap', () => {
    const result = addXp({ level: 100, xp: 0, levelCap: 100 }, 5_000);
    expect(result.state).toEqual({ level: 100, xp: 0, levelCap: 100 });
    expect(result.discardedXp).toBe(5_000);
    expect(result.levelsGained).toBe(0);
  });

  it('continues past 100 once a threshold raises the cap', () => {
    const result = addXp({ level: 100, xp: 0, levelCap: levelCap(1) }, xpToNext(100) + 1);
    expect(result.state).toEqual({ level: 101, xp: 1, levelCap: 110 });
  });

  it('stops at the raised cap of two thresholds', () => {
    const result = addXp({ level: 119, xp: 0, levelCap: levelCap(2) }, 10_000_000);
    expect(result.state.level).toBe(120);
    expect(result.state.xp).toBe(0);
    expect(result.discardedXp).toBe(10_000_000 - xpToNext(119));
  });

  it('does not change the input state', () => {
    const state: LevelState = { level: 1, xp: 0, levelCap: 100 };
    addXp(state, 1_000);
    expect(state).toEqual({ level: 1, xp: 0, levelCap: 100 });
  });

  it.each([
    ['negative experience', { level: 1, xp: 0, levelCap: 100 }, -1],
    ['fractional experience', { level: 1, xp: 0, levelCap: 100 }, 0.5],
    ['a level above the cap', { level: 101, xp: 0, levelCap: 100 }, 1],
    ['progress beyond the current level', { level: 1, xp: 80, levelCap: 100 }, 1],
    ['negative progress', { level: 1, xp: -1, levelCap: 100 }, 1],
  ])('rejects %s', (_label, state, xp) => {
    expect(() => addXp(state, xp)).toThrow(RangeError);
  });
});

describe('experience guidelines', () => {
  it('main quest steps give a quarter to two fifths of a level', () => {
    expect(mainQuestXpRange(10)).toEqual({ min: 1125, max: 1799 });
  });

  it('side quests give a tenth to a fifth of a level', () => {
    expect(sideQuestXpRange(10)).toEqual({ min: 450, max: 900 });
  });

  it('bounties give eight hundredths of a level', () => {
    expect(bountyXp(10)).toBe(360);
  });

  it('discovering a named zone gives a twentieth of a level', () => {
    expect(discoveryXp(10)).toBe(225);
    expect(discoveryXp(1)).toBe(4);
  });

  it.each(golden.gatherXp)('gathering at node level $nodeLevel', ({ nodeLevel, expected }) => {
    expect(gatherCharacterXp(nodeLevel)).toBe(expected);
  });

  it.each(golden.craftXp)('crafting at recipe level $recipeLevel', ({ recipeLevel, expected }) => {
    expect(craftCharacterXp(recipeLevel)).toBe(expected);
  });
});
