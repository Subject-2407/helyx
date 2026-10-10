import { describe, expect, it } from 'vitest';
import golden from './__golden__/kill-credit.json' with { type: 'json' };
import {
  contribution,
  eligibleGroups,
  groupPoolMult,
  groupXpPool,
  isInPartyRange,
  levelDiffXpMult,
  lootTimings,
  splitGroupXp,
  splitWithinParty,
} from './kill-credit.js';

describe('contribution', () => {
  it('weights healing fully and blocked damage at half', () => {
    const { damage, healing, blocked, expected } = golden.contribution;
    expect(contribution({ damage, healing, blocked })).toBe(expected);
    expect(() => contribution({ damage: -1, healing: 0, blocked: 0 })).toThrow(RangeError);
  });
});

describe('eligibility', () => {
  const { maxHp, below, at } = golden.eligibility;

  it('needs a tenth of max health unless the group is on top', () => {
    const groups = [
      { id: 'top', contribution: 800 },
      { id: 'at', contribution: at },
      { id: 'below', contribution: below },
    ];
    expect(eligibleGroups(groups, maxHp).map((g) => g.id)).toEqual(['top', 'at']);
  });

  it('always keeps the top group', () => {
    const groups = [
      { id: 'a', contribution: 50 },
      { id: 'b', contribution: 50 },
    ];
    expect(eligibleGroups(groups, maxHp).map((g) => g.id)).toEqual(['a']);
  });
});

describe('experience pool', () => {
  it.each(golden.pool)('$groups eligible groups', ({ groups, mult }) => {
    expect(groupPoolMult(groups)).toBeCloseTo(mult, 6);
  });

  it('splits the pool by contribution', () => {
    const shares = splitGroupXp(100, [
      { id: 'a', contribution: 300 },
      { id: 'b', contribution: 100 },
    ]);
    expect(groupXpPool(100, 2)).toBeCloseTo(115, 6);
    expect(shares[0]?.xp).toBeCloseTo(86.25, 6);
    expect(shares[1]?.xp).toBeCloseTo(28.75, 6);
    expect(splitGroupXp(100, [])).toEqual([]);
    expect(splitGroupXp(100, [{ id: 'a', contribution: 0 }])).toEqual([{ id: 'a', xp: 100 }]);
  });

  it('splits a group share evenly among members in range', () => {
    expect(splitWithinParty(115, 3)).toBe(38);
    expect(isInPartyRange(40)).toBe(true);
    expect(isInPartyRange(40.5)).toBe(false);
    expect(() => splitWithinParty(100, 0)).toThrow(RangeError);
  });
});

describe('level difference', () => {
  it.each(golden.levelDiff)('difference $delta', ({ delta, mult }) => {
    expect(levelDiffXpMult(delta)).toBe(mult);
  });
});

describe('loot timings', () => {
  it('gives the top group priority before ground loot is free for all', () => {
    expect(lootTimings()).toEqual({ priorityS: 30, groundTtlS: 180 });
  });
});
