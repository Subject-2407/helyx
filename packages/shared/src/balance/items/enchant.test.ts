import { describe, expect, it } from 'vitest';
import type { EnchantGrade } from '../../types/items.js';
import golden from './__golden__/enchant.json' with { type: 'json' };
import { applyEnchant, canEnchant, enchantCost, enchantEffect } from './enchant.js';

describe('enchanting', () => {
  it.each(golden.costs)('grade $grade at item level $ilvl', (row) => {
    expect(enchantCost(row.grade as EnchantGrade, row.ilvl)).toEqual({
      essences: row.essences,
      coins: row.coins,
      level: row.level,
    });
    expect(canEnchant(row.grade as EnchantGrade, row.level)).toBe(true);
    expect(canEnchant(row.grade as EnchantGrade, row.level - 1)).toBe(false);
  });

  it.each(golden.effects)('grade $grade effects', ({ grade, weapon, other }) => {
    expect(enchantEffect(grade as EnchantGrade, true)).toBe(weapon);
    expect(enchantEffect(grade as EnchantGrade, false)).toBe(other);
  });

  it('overwrites the previous enchant', () => {
    const next = { aspect: 'order' as const, grade: 2 as const };
    expect(applyEnchant({ aspect: 'void', grade: 3 }, next)).toBe(next);
    expect(applyEnchant(undefined, next)).toBe(next);
  });

  it('rejects an item level below the minimum', () => {
    expect(() => enchantCost(1, 0)).toThrow(RangeError);
  });
});
