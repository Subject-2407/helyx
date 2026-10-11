import { describe, expect, it } from 'vitest';
import type { CrystalGrade, SocketHost } from '../constants.js';
import golden from './__golden__/sockets.json' with { type: 'json' };
import { canDrill, combineCost, combinedGrade, extractCost, socketEffect } from './sockets.js';

describe('sockets', () => {
  it.each(golden.extract)('extracting a $grade crystal', ({ units, coins }) => {
    expect(extractCost(units)).toBe(coins);
  });

  it('rejects negative crystal units', () => {
    expect(() => extractCost(-1)).toThrow(RangeError);
  });

  it.each(golden.combine)('combining $grade crystals', ({ grade, next, coins }) => {
    expect(combinedGrade(grade as CrystalGrade)).toBe(next);
    expect(combineCost(grade as CrystalGrade)).toEqual({ inputs: 3, coins });
  });

  it('cannot combine the top grade', () => {
    expect(combinedGrade('perfect')).toBeNull();
    expect(combineCost('perfect')).toBeNull();
  });

  it.each(golden.effects)('$grade in a $host socket', ({ host, grade, effect }) => {
    expect(socketEffect(host as SocketHost, grade as CrystalGrade)).toBeCloseTo(effect, 9);
  });

  it('drills up to the rarity maximum', () => {
    expect(canDrill(0, 1)).toBe(true);
    expect(canDrill(1, 1)).toBe(false);
    expect(canDrill(0, 0)).toBe(false);
    expect(canDrill(2, 9)).toBe(true);
  });
});
