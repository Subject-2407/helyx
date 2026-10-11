import { describe, expect, it } from 'vitest';
import golden from './__golden__/refine.json' with { type: 'json' };
import { canRefine, hone, honeCost, rerollCost } from './refine.js';

describe('refinement', () => {
  it.each(golden.reroll)('reroll at item level $ilvl after $count rerolls', (row) => {
    expect(rerollCost(row.ilvl, row.count)).toEqual({ stones: row.stones, coins: row.coins });
  });

  it.each(golden.hone)('honing quality $quality', ({ quality, after }) => {
    expect(hone(quality)).toBe(after);
  });

  it('charges powder and coins to hone, and never touches traits', () => {
    const { ilvl, powder, coins } = golden.honeCost;
    expect(honeCost(ilvl)).toEqual({ powder, coins });
    expect(canRefine({ isTrait: false })).toBe(true);
    expect(canRefine({ isTrait: true })).toBe(false);
    expect(() => rerollCost(0, 0)).toThrow(RangeError);
  });
});
