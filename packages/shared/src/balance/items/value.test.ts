import { describe, expect, it } from 'vitest';
import type { Rarity } from '../../types/items.js';
import values from './__golden__/value.json' with { type: 'json' };
import { equipmentValue, vendorBuyPrice } from './value.js';

describe('value', () => {
  it.each(values.samples)('item level $ilvl, rarity $rarity, +$upgrade', (row) => {
    const value = equipmentValue(row.ilvl, row.rarity as Rarity, row.upgrade);
    expect(value).toBe(row.value);
    expect(vendorBuyPrice(value)).toBe(row.vendor);
  });

  it('rejects impossible inputs', () => {
    expect(() => equipmentValue(1, 0, 16)).toThrow(RangeError);
    expect(() => vendorBuyPrice(-1)).toThrow(RangeError);
  });
});
