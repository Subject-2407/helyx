import { describe, expect, it } from 'vitest';
import golden from './__golden__/derived-stats.json' with { type: 'json' };
import {
  aspectPower,
  aspectResist,
  attackPower,
  attackSpeed,
  carryCapacity,
  critChance,
  critDamage,
  damageReduction,
  defense,
  deriveStats,
  maxHp,
  maxMana,
  maxStamina,
  moveSpeed,
  statusResist,
  syncGrowthMult,
  type CoreStats,
} from './derived-stats.js';

const STARTER: CoreStats = golden.starter.input.stats;

describe('derived stats of a new character', () => {
  const derived = deriveStats({
    level: golden.starter.input.level,
    stats: STARTER,
    weaponAtk: golden.starter.input.weaponAtk,
  });

  it.each(Object.entries(golden.starter.expected))('%s', (key, value) => {
    expect(derived[key as keyof typeof derived]).toBeCloseTo(value, 4);
  });

  it('gives exact whole numbers for health, mana, stamina, attack and carry', () => {
    expect(derived.maxHp).toBe(120);
    expect(derived.maxMana).toBe(60);
    expect(derived.maxStamina).toBe(105);
    expect(derived.attackPower).toBe(20);
    expect(derived.carryCapacity).toBe(55);
  });

  it('caps every aspect resist and leaves missing ones out', () => {
    const withResists = deriveStats({
      level: 1,
      stats: STARTER,
      aspectResistBonus: { growth: 0.2, entropy: 0.9 },
    });
    expect(withResists.aspectResists).toEqual({ growth: 0.2, entropy: 0.6 });
    expect(derived.aspectResists).toEqual({});
  });

  it('feeds gear and affix bonuses into the matching formulas', () => {
    const geared = deriveStats({
      level: 10,
      stats: { str: 20, dex: 12, agi: 9, vit: 15, int: 7, wis: 11 },
      weaponAtk: 30,
      weaponApw: 4,
      armorDef: 18,
      bonus: {
        hp: 40,
        hpPct: 0.1,
        mana: 12,
        atk: 3,
        apw: 2,
        def: 5,
        crit: 0.01,
        critDamage: 0.2,
        attackSpeed: 0.05,
        move: 0.02,
        statusResist: 0.04,
        carry: 6,
      },
    });
    expect(geared.maxHp).toBeCloseTo(maxHp(15, 10, 40, 0.1), 4);
    expect(geared.maxMana).toBe(maxMana(7, 10, 12));
    expect(geared.maxStamina).toBe(maxStamina(9));
    expect(geared.attackPower).toBe(attackPower(30, 20, 3));
    expect(geared.aspectPower).toBe(aspectPower(4, 7, 2));
    expect(geared.defense).toBe(defense(18, 15, 5));
    expect(geared.critChance).toBeCloseTo(critChance(12, 0.01), 4);
    expect(geared.critDamage).toBeCloseTo(critDamage(0.2), 4);
    expect(geared.attackSpeed).toBeCloseTo(attackSpeed(12, 0.05), 4);
    expect(geared.moveSpeed).toBeCloseTo(moveSpeed(9, 0.02), 4);
    expect(geared.statusResist).toBeCloseTo(statusResist(11, 0.04), 4);
    expect(geared.carryCapacity).toBe(carryCapacity(20, 15, 6));
  });
});

describe('max health', () => {
  it('grows with vitality and level', () => {
    expect(maxHp(5, 1)).toBe(120);
    expect(maxHp(6, 1)).toBe(132);
    expect(maxHp(5, 2)).toBe(128);
  });

  it('applies the percent bonus after adding flat gear health', () => {
    // (60 + 60 + 0 + 30) * 1.1 = 165; applying the percent before the gear would give 162.
    expect(maxHp(5, 1, 30, 0.1)).toBeCloseTo(165, 4);
  });

  it('lowers health with a negative percent', () => {
    expect(maxHp(5, 1, 0, -0.2)).toBeCloseTo(96, 4);
  });

  it('rejects a level below one', () => {
    expect(() => maxHp(5, 0)).toThrow(RangeError);
  });
});

describe('max mana and stamina', () => {
  it('mana grows with intelligence, level and gear', () => {
    expect(maxMana(5, 1)).toBe(60);
    expect(maxMana(5, 3, 10)).toBe(74);
  });

  it('stamina grows with agility', () => {
    expect(maxStamina(5)).toBe(105);
    expect(maxStamina(20)).toBe(120);
  });
});

describe('damage reduction', () => {
  it.each(golden.damageReduction)('$name', ({ def, attackerLevel, expected }) => {
    expect(damageReduction(def, attackerLevel)).toBeCloseTo(expected, 4);
  });

  it('treats negative defense as none', () => {
    expect(damageReduction(-500, 1)).toBe(0);
  });

  it('rejects an attacker level below one', () => {
    expect(() => damageReduction(10, 0)).toThrow(RangeError);
  });
});

describe('caps', () => {
  it('crit chance stops at its cap', () => {
    expect(critChance(1000)).toBe(golden.caps.critChanceAtDex1000);
  });

  it('attack speed stops at its cap', () => {
    expect(attackSpeed(1000)).toBe(golden.caps.attackSpeedAtDex1000);
  });

  it('move speed stops at its cap', () => {
    expect(moveSpeed(1000)).toBeCloseTo(golden.caps.moveSpeedAtAgi1000, 4);
  });

  it('crit damage stops at its cap', () => {
    expect(critDamage(5)).toBe(golden.caps.critDamageWithAffix5);
  });

  it('status resist stops at its cap', () => {
    expect(statusResist(1000)).toBe(golden.caps.statusResistAtWis1000);
  });

  it('aspect resist stops at its cap', () => {
    expect(aspectResist(2)).toBe(golden.caps.aspectResistAtSum2);
    expect(aspectResist(0.25)).toBe(0.25);
  });
});

describe('carry capacity', () => {
  it('grows with strength and vitality', () => {
    expect(carryCapacity(5, 5)).toBe(55);
    expect(carryCapacity(10, 8, 4)).toBe(72);
  });
});

describe('mind growth multiplier', () => {
  it.each(golden.growth)('$name', ({ int, wis, expected }) => {
    expect(syncGrowthMult(int, wis)).toBeCloseTo(expected, 4);
  });
});

describe('reference builds', () => {
  it.each(golden.swordBuild)('$name', ({ str, weaponAtk, expected }) => {
    expect(attackPower(weaponAtk, str)).toBe(expected);
  });

  it.each(golden.casterBuild)('$name', ({ int, weaponApw, expected }) => {
    expect(aspectPower(weaponApw, int)).toBe(expected);
  });
});
