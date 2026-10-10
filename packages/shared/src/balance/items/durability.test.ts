import { describe, expect, it } from 'vitest';
import type { Rarity } from '../../types/items.js';
import golden from './__golden__/durability.json' with { type: 'json' };
import { applyRepairKit, applyWear, isBroken, repairCost } from './durability.js';

describe('wear', () => {
  it('takes one point from a weapon per 25 hits landed', () => {
    const fresh = { durability: 80, counter: 0 };
    expect(applyWear(fresh, 'weapon', { hits: golden.weapon.below })).toEqual({
      durability: 80,
      counter: 24,
    });
    expect(applyWear(fresh, 'weapon', { hits: golden.weapon.at })).toEqual({
      durability: 79,
      counter: 0,
    });
  });

  it('counts Entropy hits double', () => {
    const fresh = { durability: 80, counter: 0 };
    const hits = golden.weapon.entropyHitsForPoint;
    expect(applyWear(fresh, 'weapon', { hits, entropyHits: hits }).durability).toBe(79);
    expect(() => applyWear(fresh, 'weapon', { hits: 1, entropyHits: 2 })).toThrow(RangeError);
  });

  it('wears armor per hits taken and tools per gather', () => {
    const fresh = { durability: 80, counter: 0 };
    expect(applyWear(fresh, 'armor', { hits: golden.armor.hitsPerPoint * 2 }).durability).toBe(78);
    expect(applyWear(fresh, 'tool', { hits: 3 }).durability).toBe(77);
  });

  it('breaks at zero without destroying the item', () => {
    const worn = applyWear({ durability: 1, counter: 0 }, 'tool', { hits: 5 });
    expect(worn.durability).toBe(0);
    expect(isBroken(worn.durability)).toBe(true);
    expect(isBroken(1)).toBe(false);
  });
});

describe('repair', () => {
  it.each(golden.repair)('$missing missing at item level $ilvl, rarity $rarity', (row) => {
    expect(repairCost(row.missing, row.ilvl, row.rarity as Rarity)).toBe(row.coins);
  });

  it('restores a fixed amount with a kit, never past the maximum', () => {
    expect(applyRepairKit(10, 80)).toBe(10 + golden.kit);
    expect(applyRepairKit(70, 80)).toBe(80);
  });
});
