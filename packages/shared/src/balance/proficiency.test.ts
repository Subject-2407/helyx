import { describe, expect, it } from 'vitest';
import golden from './__golden__/proficiency.json' with { type: 'json' };
import {
  addProfXp,
  canGainProfXp,
  PROF_MAX_LEVEL,
  PROF_USE_COOLDOWN_S,
  profCostMult,
  profDamageMult,
  profXpToNext,
  totalProfXpToMax,
} from './proficiency.js';

describe('ability proficiency', () => {
  it.each(golden.levels)('$name multipliers', ({ prof, damageMult, costMult }) => {
    expect(profDamageMult(prof)).toBeCloseTo(damageMult, 4);
    expect(profCostMult(prof)).toBeCloseTo(costMult, 4);
  });

  it.each(golden.levels)('$name experience to next', ({ prof, xpToNext }) => {
    if (xpToNext === null) {
      expect(() => profXpToNext(prof)).toThrow(RangeError);
    } else {
      expect(profXpToNext(prof)).toBe(xpToNext);
    }
  });

  it('needs exactly the documented total to reach the highest level', () => {
    expect(totalProfXpToMax()).toBe(golden.totalXpToMax);
    expect(PROF_MAX_LEVEL).toBe(golden.maxLevel);
  });

  it('rejects levels outside the valid range', () => {
    expect(() => profDamageMult(0)).toThrow(RangeError);
    expect(() => profCostMult(11)).toThrow(RangeError);
    expect(() => profDamageMult(1.5)).toThrow(RangeError);
  });

  it('levels up repeatedly and stops at the highest level', () => {
    expect(addProfXp({ level: 1, xp: 0 }, 19)).toEqual({ level: 1, xp: 19 });
    expect(addProfXp({ level: 1, xp: 19 }, 1)).toEqual({ level: 2, xp: 0 });
    expect(addProfXp({ level: 1, xp: 0 }, 65)).toEqual({ level: 3, xp: 5 });
    expect(addProfXp({ level: 1, xp: 0 }, golden.totalXpToMax)).toEqual({ level: 10, xp: 0 });
    expect(addProfXp({ level: 9, xp: 170 }, 500)).toEqual({ level: 10, xp: 0 });
    expect(addProfXp({ level: 10, xp: 0 }, 5)).toEqual({ level: 10, xp: 0 });
  });

  it('rejects negative experience', () => {
    expect(() => addProfXp({ level: 1, xp: 0 }, -1)).toThrow(RangeError);
  });

  it('grants use experience at most once per cooldown', () => {
    expect(PROF_USE_COOLDOWN_S).toBe(golden.useCooldownS);
    expect(canGainProfXp(undefined, 0)).toBe(true);
    expect(canGainProfXp(10, 11.49)).toBe(false);
    expect(canGainProfXp(10, 11.5)).toBe(true);
  });
});
