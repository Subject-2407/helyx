import { describe, expect, it } from 'vitest';
import { createSfc32 } from '../../rng/sfc32.js';
import { SEED_A } from '../../testing/seeds.js';
import { RARITIES, type Rarity } from '../../types/items.js';
import tables from '../__golden__/tables.json' with { type: 'json' };
import { sum } from '../math.js';
import golden from './__golden__/rarity.json' with { type: 'json' };
import { downgradeIfNoUnique, rollRarity } from './drops.js';
import { rarityRow, rollSocketCount } from './rarity.js';

describe('rarity rows', () => {
  it.each(RARITIES.map((rarity) => [rarity]))('rarity %i', (rarity) => {
    const { key: _key, ...row } = tables.rarities[rarity] ?? { key: '' };
    expect(rarityRow(rarity)).toEqual(row);
  });

  it('rolls socket counts inside the rarity range', () => {
    const rng = createSfc32(SEED_A);
    for (const rarity of RARITIES) {
      const row = rarityRow(rarity);
      const seen = new Set<number>();
      for (let roll = 0; roll < 200; roll += 1) {
        const sockets = rollSocketCount(rarity, rng);
        expect(sockets).toBeGreaterThanOrEqual(row.socketMin);
        expect(sockets).toBeLessThanOrEqual(row.socketMax);
        seen.add(sockets);
      }
      expect(seen.size).toBe(row.socketMax - row.socketMin + 1);
    }
  });
});

describe('rarity weight tables', () => {
  it('normalizes relative weights by their sum', () => {
    expect(sum(golden.weightTables.elite)).toBe(golden.weightSums.elite);
  });

  it.each(Object.entries(golden.weightTables))(
    'the %s table rolls at its rates',
    (_name, weights) => {
      const rng = createSfc32(SEED_A);
      const counts = new Array<number>(RARITIES.length).fill(0);
      const { rolls, tolerance, commonTiers } = golden.monteCarlo;
      for (let roll = 0; roll < rolls; roll += 1) {
        const rarity = rollRarity(weights, rng);
        counts[rarity] = (counts[rarity] ?? 0) + 1;
      }
      const total = sum(weights);
      weights.forEach((weight, rarity) => {
        if (weight === 0) {
          expect(counts[rarity], `rarity ${rarity}`).toBe(0);
        } else if (rarity < commonTiers || weight / total > 0.05) {
          expect(Math.abs((counts[rarity] ?? 0) / rolls - weight / total)).toBeLessThan(tolerance);
        }
      });
    },
  );

  it('never rolls celestial from the normal table', () => {
    const rng = createSfc32(SEED_A);
    for (let roll = 0; roll < 10_000; roll += 1) {
      expect(rollRarity(golden.weightTables.normal, rng)).not.toBe(9);
    }
  });

  it('rejects a table without one weight per rarity', () => {
    expect(() => rollRarity([1, 2], createSfc32(SEED_A))).toThrow(RangeError);
  });
});

describe('unique downgrade', () => {
  it('drops a legendary with no eligible unique to epic', () => {
    expect(downgradeIfNoUnique(5, () => false)).toBe(4);
  });

  it('stops at the first tier with an eligible unique', () => {
    const eligible = (rarity: Rarity): boolean => rarity === 6;
    expect(downgradeIfNoUnique(8, eligible)).toBe(6);
    expect(downgradeIfNoUnique(3, () => false)).toBe(3);
  });
});
