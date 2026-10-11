import { describe, expect, it } from 'vitest';
import { createSfc32 } from '../rng/sfc32.js';
import { SEED_A, SEED_B } from '../testing/seeds.js';
import golden from './__golden__/sim-fight.json' with { type: 'json' };
import { monsterStats } from './monsters.js';
import {
  basicDps,
  comboDpsBeforeMitigation,
  comboTimeS,
  effectiveAttackSpeed,
  simulateFight,
  type AttackPattern,
  type FightTarget,
} from './sim-fight.js';

const PATTERNS: Readonly<Record<string, AttackPattern>> = golden.patterns;
const NO_ROLLS = { crit: false, variance: false } as const;

function standardMonster(level: number): FightTarget {
  const { hp, def } = monsterStats(level, 'standard');
  return { hp, def, level };
}

function pattern(name: string): AttackPattern {
  const found = PATTERNS[name];
  if (found === undefined) throw new Error(`no fixture pattern ${name}`);
  return found;
}

describe('fight simulator against a standard monster of the same level', () => {
  for (const fight of golden.fights) {
    it.each(fight.rows)(`${fight.name} at level $level`, ({ level, atk, hits, ttkS, perHit }) => {
      const result = simulateFight(
        { level, power: atk, attackSpeed: 1, pattern: pattern(fight.pattern) },
        standardMonster(level),
        NO_ROLLS,
      );
      expect(result.hitsToKill).toBe(hits);
      expect(result.ttkS).toBeCloseTo(ttkS, 2);
      if (perHit !== undefined) expect(result.perHitDamage).toEqual(perHit);
    });
  }
});

describe('sustained basic damage', () => {
  it.each(golden.dpsRatio)('fist styles against the sword at level $level', (row) => {
    const sword = comboDpsBeforeMitigation(pattern('sword'), row.swordAtk, 1);
    const single = comboDpsBeforeMitigation(pattern('fistSingle'), row.singleAtk, 1) / sword;
    const dual = comboDpsBeforeMitigation(pattern('fistDual'), row.dualAtk, 1) / sword;
    expect(Math.abs(single - row.single)).toBeLessThanOrEqual(0.01);
    expect(Math.abs(dual - row.dual)).toBeLessThanOrEqual(0.01);
    // A single fist stays within ten percent of the sword; two fists add up to fifteen more.
    expect(Math.abs(single - 1)).toBeLessThanOrEqual(0.1);
    expect(dual / single).toBeGreaterThanOrEqual(1);
    expect(dual / single).toBeLessThanOrEqual(1.15);
  });

  it('counts mitigation and rounding against a target', () => {
    const target = standardMonster(15);
    const dps = basicDps(pattern('sword'), 150, 1, target, 15);
    expect(dps).toBeCloseTo((95 + 95 + 136) / 1.36, 4);
    expect(dps).toBeLessThan(comboDpsBeforeMitigation(pattern('sword'), 150, 1));
  });
});

describe('fight simulator timing', () => {
  it('divides swing times by the attack speed and the style factor', () => {
    expect(comboTimeS(pattern('sword'), 1)).toBeCloseTo(1.36, 4);
    expect(comboTimeS(pattern('sword'), 1.25)).toBeCloseTo(1.36 / 1.25, 4);
    expect(comboTimeS(pattern('fistSingle'), 1)).toBeCloseTo(1.08 / 1.15, 4);
    expect(comboTimeS(pattern('fistDual'), 1)).toBeCloseTo(1.14 / 1.15, 4);
  });

  it('caps the attack speed', () => {
    expect(effectiveAttackSpeed(1.4, pattern('fistSingle'))).toBe(1.5);
    expect(effectiveAttackSpeed(1.4, pattern('sword'))).toBe(1.4);
    expect(() => effectiveAttackSpeed(0, pattern('sword'))).toThrow(RangeError);
  });
});

describe('fight simulator with random rolls', () => {
  const attacker = {
    level: 15,
    power: 150,
    attackSpeed: 1,
    pattern: pattern('sword'),
    critChance: 0.3,
    critDamage: 1.5,
  };
  const target = standardMonster(15);

  it('replays the same fight from the same seed', () => {
    const run = (seed: number) =>
      simulateFight(attacker, target, { crit: true, variance: true, rng: createSfc32(seed) });
    expect(run(SEED_A)).toEqual(run(SEED_A));
    expect(run(SEED_B)).toEqual(run(SEED_B));
  });

  it('rolls crits without variance when asked', () => {
    const plain = simulateFight(attacker, target, NO_ROLLS);
    const critOnly = simulateFight(attacker, target, {
      crit: true,
      variance: false,
      rng: createSfc32(SEED_A),
    });
    const ratios = critOnly.perHitDamage.map((damage, i) => damage / (plain.perHitDamage[i] ?? 1));
    for (const ratio of ratios) {
      expect([1, 1.5].some((r) => Math.abs(ratio - r) < 0.02)).toBe(true);
    }
    expect(critOnly.hitsToKill).toBeLessThanOrEqual(plain.hitsToKill);
  });

  it('needs a random source for crits or variance', () => {
    expect(() => simulateFight(attacker, target, { crit: true, variance: false })).toThrow(
      RangeError,
    );
    expect(() => simulateFight(attacker, target, { crit: false, variance: true })).toThrow(
      RangeError,
    );
  });

  it('rejects empty patterns and negative health', () => {
    expect(() => simulateFight({ ...attacker, pattern: { hits: [] } }, target, NO_ROLLS)).toThrow(
      RangeError,
    );
    expect(() => simulateFight(attacker, { ...target, hp: -1 }, NO_ROLLS)).toThrow(RangeError);
  });

  it('ends at once against a target with no health', () => {
    expect(simulateFight(attacker, { ...target, hp: 0 }, NO_ROLLS)).toEqual({
      hitsToKill: 0,
      ttkS: 0,
      perHitDamage: [],
    });
  });

  it('gives up on a target that will not die in any sensible time', () => {
    const result = simulateFight(attacker, { ...target, hp: 1e9 }, NO_ROLLS);
    expect(result.hitsToKill).toBe(10_000);
  });
});
