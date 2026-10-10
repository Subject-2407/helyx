import { describe, expect, it } from 'vitest';
import { createSfc32 } from '../rng/sfc32.js';
import { SEED_A } from '../testing/seeds.js';
import type { Archetype } from '../types/combat.js';
import golden from './__golden__/monsters.json' with { type: 'json' };
import { instanceHpMult, monsterCoins, monsterStats, worldBossHpMult } from './monsters.js';

describe('monster templates', () => {
  it.each(golden.templates)('level $level $archetype', ({ level, archetype, hp, atk, def, xp }) => {
    const stats = monsterStats(level, archetype as Archetype);
    expect({ hp: stats.hp, atk: stats.atk, def: stats.def, xp: stats.xp }).toEqual({
      hp,
      atk,
      def,
      xp,
    });
  });

  it('takes speed and poise from the archetype', () => {
    expect(monsterStats(5, 'skirmisher')).toMatchObject({ speed: 90, poise: 25 });
  });

  it('rejects levels below one', () => {
    expect(() => monsterStats(0, 'standard')).toThrow(RangeError);
    expect(() => monsterCoins(0, 'standard', createSfc32(SEED_A))).toThrow(RangeError);
  });
});

describe('monster coins', () => {
  it('drop at their rate and stay within their range', () => {
    const c = golden.coins;
    const rng = createSfc32(SEED_A);
    let drops = 0;
    for (let roll = 0; roll < c.rolls; roll += 1) {
      const coins = monsterCoins(c.level, c.archetype as Archetype, rng);
      if (coins > 0) {
        drops += 1;
        expect(coins).toBeGreaterThanOrEqual(c.min);
        expect(coins).toBeLessThanOrEqual(c.max);
      }
    }
    expect(Math.abs(drops / c.rolls - c.chance)).toBeLessThan(c.tolerance);
  });

  it('never drop from an archetype without coins', () => {
    const rng = createSfc32(SEED_A);
    for (let roll = 0; roll < 100; roll += 1) {
      expect(monsterCoins(10, 'trial_boss', rng)).toBe(0);
    }
  });
});

describe('boss scaling', () => {
  it.each(golden.worldBoss)('world boss with $players players nearby', ({ players, mult }) => {
    expect(worldBossHpMult(players)).toBeCloseTo(mult, 6);
  });

  it.each(golden.instance)('instance boss for a party of $party', ({ party, mult }) => {
    expect(instanceHpMult(party)).toBeCloseTo(mult, 6);
  });

  it('rejects an empty party', () => {
    expect(() => instanceHpMult(0)).toThrow(RangeError);
  });
});
