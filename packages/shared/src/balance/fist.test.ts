import { describe, expect, it } from 'vitest';
import golden from './__golden__/fist.json' with { type: 'json' };
import { attackPower, attackSpeed } from './derived-stats.js';
import {
  abilityUsableWith,
  bareFistAtk,
  dualFistWeaponAtk,
  fistAttackSpeed,
  fistComboHits,
  fistHandsBonus,
  fistPoiseDamage,
  fistReachPx,
  isBareHanded,
  isFistMainHand,
  isOffHandLegal,
  tier1SwordAtk,
  type MainHand,
  type OffHand,
} from './fist.js';

/** Reference builds put two of every three level-up points into strength. */
const refStr = (level: number): number => 5 + 2 * (level - 1);
const REF_DEX = 5;

describe('fist weapon attack', () => {
  it.each(golden.bareAtk)('bare hands at level $level', ({ level, atk }) => {
    expect(bareFistAtk(level)).toBe(atk);
  });

  it('follows the tier-1 sword curve', () => {
    expect(tier1SwordAtk(1)).toBe(10);
    expect(tier1SwordAtk(15)).toBe(80);
    expect(() => tier1SwordAtk(0)).toThrow(RangeError);
  });

  it.each(golden.referenceBuild)(
    'bare-handed reference build at level $level',
    ({ level, fistAtk, swordAtk, ratio, speedRatio }) => {
      const total = attackPower(bareFistAtk(level), refStr(level));
      expect(total).toBe(fistAtk);
      expect(total / swordAtk).toBeCloseTo(ratio, 3);
      const fistRate = total * fistAttackSpeed(REF_DEX);
      const swordRate = swordAtk * attackSpeed(REF_DEX);
      // The published ratios carry three decimals, so compare at that display precision.
      expect(fistRate / swordRate).toBeCloseTo(speedRatio, 2);
    },
  );

  it('adds half the off-hand fist to the main hand', () => {
    expect(dualFistWeaponAtk(golden.dual.main, golden.dual.off)).toBe(golden.dual.atk);
    expect(() => dualFistWeaponAtk(-1, 0)).toThrow(RangeError);
    expect(() => dualFistWeaponAtk(0, -1)).toThrow(RangeError);
  });

  it('adds the hands armor bonus only with a fist main hand', () => {
    const { def, bonus, override } = golden.handsBonus;
    expect(fistHandsBonus(null, def)).toBe(bonus);
    expect(fistHandsBonus('fist', def)).toBe(bonus);
    expect(fistHandsBonus('fist', def, override)).toBe(override);
    expect(fistHandsBonus('sword', def)).toBe(0);
    expect(fistHandsBonus('sword', def, override)).toBe(0);
    expect(() => fistHandsBonus('fist', -1)).toThrow(RangeError);
  });
});

describe('fist combat feel', () => {
  it.each(golden.attackSpeed)('attack speed at dexterity $dex', ({ dex, speed }) => {
    expect(fistAttackSpeed(dex)).toBeCloseTo(speed, 4);
  });

  it('counts speed affixes before the fist factor and the cap', () => {
    expect(fistAttackSpeed(0, 0.1)).toBeCloseTo(1.1 * 1.15, 4);
    expect(fistAttackSpeed(0, 1)).toBe(1.5);
  });

  it('has a short reach and heavier poise damage', () => {
    expect(fistReachPx()).toBe(golden.reachPx);
    expect(fistPoiseDamage(golden.poise.sword)).toBe(golden.poise.fist);
    expect(() => fistPoiseDamage(-1)).toThrow(RangeError);
  });

  it('adds one hit to the combo with two fists', () => {
    expect(fistComboHits(false)).toBe(golden.dual.singleHits);
    expect(fistComboHits(true)).toBe(golden.dual.hits);
  });
});

describe('fist hand rules', () => {
  const legality: readonly [MainHand, boolean, OffHand, boolean][] = [
    ['fist', false, 'fist', true],
    ['fist', false, 'shield', true],
    [null, false, 'shield', true],
    ['sword', false, 'shield', true],
    ['fist', false, null, true],
    ['greatsword', true, null, true],
    ['sword', false, 'fist', false],
    [null, false, 'fist', false],
    ['greatsword', true, 'fist', false],
    ['greatsword', true, 'shield', false],
    ['fist', false, 'sword', false],
    ['sword', false, 'dagger', false],
  ];

  it.each(legality)('main %s (two-handed %s) with off hand %s', (main, twoHanded, off, ok) => {
    expect(isOffHandLegal(main, twoHanded, off)).toBe(ok);
  });

  it('has a single off-hand slot, so two fists and a shield can never be worn together', () => {
    const offHands: OffHand[] = ['fist', 'shield'];
    expect(offHands.filter((off) => isOffHandLegal('fist', false, off))).toHaveLength(2);
  });

  it('treats bare hands as an empty main hand only', () => {
    expect(isBareHanded(null)).toBe(true);
    expect(isBareHanded('fist')).toBe(false);
    expect(isBareHanded('sword')).toBe(false);
    expect(isFistMainHand(null)).toBe(true);
    expect(isFistMainHand('fist')).toBe(true);
    expect(isFistMainHand('dagger')).toBe(false);
  });

  it('lets fist abilities run with bare hands or a fist item', () => {
    expect(abilityUsableWith(['fist'], null)).toBe(true);
    expect(abilityUsableWith(['fist'], 'fist')).toBe(true);
    expect(abilityUsableWith(['fist'], 'sword')).toBe(false);
    expect(abilityUsableWith(['sword'], null)).toBe(false);
    expect(abilityUsableWith(['sword', 'greatsword'], 'greatsword')).toBe(true);
  });

  it('lets any-weapon abilities run with everything', () => {
    for (const main of [null, 'fist', 'sword', 'bow', 'catalyst'] as const) {
      expect(abilityUsableWith('any', main)).toBe(true);
    }
  });
});
