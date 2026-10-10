import { describe, expect, it } from 'vitest';
import type { CrystalGrade, SocketHost } from '../constants.js';
import enchantGolden from './__golden__/enchant.json' with { type: 'json' };
import golden from './__golden__/refine.json' with { type: 'json' };
import socketGolden from './__golden__/sockets.json' with { type: 'json' };
import { applyEnchant, canEnchant, enchantCost, enchantEffect } from './enchant.js';
import { canRefine, hone, honeCost, rerollCost } from './refine.js';
import { canDrill, combineCost, combinedGrade, extractCost, socketEffect } from './sockets.js';
import type { EnchantGrade } from '../../types/items.js';

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

describe('enchanting', () => {
  it.each(enchantGolden.costs)('grade $grade at item level $ilvl', (row) => {
    expect(enchantCost(row.grade as EnchantGrade, row.ilvl)).toEqual({
      essences: row.essences,
      coins: row.coins,
      level: row.level,
    });
    expect(canEnchant(row.grade as EnchantGrade, row.level)).toBe(true);
    expect(canEnchant(row.grade as EnchantGrade, row.level - 1)).toBe(false);
  });

  it.each(enchantGolden.effects)('grade $grade effects', ({ grade, weapon, other }) => {
    expect(enchantEffect(grade as EnchantGrade, true)).toBe(weapon);
    expect(enchantEffect(grade as EnchantGrade, false)).toBe(other);
  });

  it('overwrites the previous enchant', () => {
    const next = { aspect: 'order' as const, grade: 2 as const };
    expect(applyEnchant({ aspect: 'void', grade: 3 }, next)).toBe(next);
    expect(applyEnchant(undefined, next)).toBe(next);
  });
});

describe('sockets', () => {
  it.each(socketGolden.extract)('extracting a $grade crystal', ({ units, coins }) => {
    expect(extractCost(units)).toBe(coins);
  });

  it.each(socketGolden.combine)('combining $grade crystals', ({ grade, next, coins }) => {
    expect(combinedGrade(grade as CrystalGrade)).toBe(next);
    expect(combineCost(grade as CrystalGrade)).toEqual({ inputs: 3, coins });
  });

  it('cannot combine the top grade', () => {
    expect(combinedGrade('perfect')).toBeNull();
    expect(combineCost('perfect')).toBeNull();
  });

  it.each(socketGolden.effects)('$grade in a $host socket', ({ host, grade, effect }) => {
    expect(socketEffect(host as SocketHost, grade as CrystalGrade)).toBeCloseTo(effect, 9);
  });

  it('drills up to the rarity maximum', () => {
    expect(canDrill(0, 1)).toBe(true);
    expect(canDrill(1, 1)).toBe(false);
    expect(canDrill(0, 0)).toBe(false);
    expect(canDrill(2, 9)).toBe(true);
  });
});
