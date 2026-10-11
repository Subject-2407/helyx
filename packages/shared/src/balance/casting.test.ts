import { describe, expect, it } from 'vitest';
import golden from './__golden__/casting.json' with { type: 'json' };
import {
  canOvercharge,
  castModeMult,
  forceManaCost,
  forcePower,
  staminaAbilityCost,
} from './casting.js';

const { ability } = golden;

describe('force casting rules', () => {
  it('charges full mana at a mana factor of 1', () => {
    const { manaFactor, mana } = golden.fullCost;
    expect(forceManaCost(ability.baseMana, manaFactor, ability.prof, false)).toBe(mana);
  });

  it('scales the cost by the mana factor it is given', () => {
    const { manaFactor, mana } = golden.halfCost;
    expect(forceManaCost(ability.baseMana, manaFactor, ability.prof, false)).toBe(mana);
  });

  it('makes overcharge cost more and hit harder', () => {
    expect(forceManaCost(ability.baseMana, 1, ability.prof, true)).toBe(golden.overcharge.mana);
    expect(forcePower(true)).toBe(golden.overcharge.power);
    expect(forcePower(false)).toBe(1);
  });

  it('allows overcharge only for able abilities after a long enough hold', () => {
    const holdS = golden.overcharge.holdS;
    expect(canOvercharge({ mode: 'force', overchargeable: true, holdS })).toBe(true);
    expect(canOvercharge({ mode: 'force', overchargeable: true, holdS: holdS - 0.01 })).toBe(false);
    expect(canOvercharge({ mode: 'force', overchargeable: false, holdS: 1 })).toBe(false);
  });

  it('applies the proficiency cost reduction to mana', () => {
    const { prof, mana } = golden.proficiencyTen;
    expect(forceManaCost(ability.baseMana, 1, prof, false)).toBe(mana);
  });

  it('rejects costs and mana factors outside their ranges', () => {
    expect(() => forceManaCost(-1, 1, 1, false)).toThrow(RangeError);
    expect(() => forceManaCost(18, 0, 1, false)).toThrow(RangeError);
    expect(() => forceManaCost(18, 1.01, 1, false)).toThrow(RangeError);
    expect(() => forceManaCost(18, Number.NaN, 1, false)).toThrow(RangeError);
  });

  it('picks the power multiplier of each mode', () => {
    expect(castModeMult({ kind: 'physical' })).toBe(1);
    expect(castModeMult({ kind: 'force', overcharge: false })).toBe(1);
    expect(castModeMult({ kind: 'force', overcharge: true })).toBe(golden.overcharge.power);
    expect(castModeMult({ kind: 'scaled', power: golden.scaledPower })).toBe(golden.scaledPower);
    expect(() => castModeMult({ kind: 'scaled', power: -1 })).toThrow(RangeError);
  });

  it('reduces physical stamina costs with proficiency', () => {
    const { base, profOne, profTen } = golden.stamina;
    expect(staminaAbilityCost(base, 1)).toBe(profOne);
    expect(staminaAbilityCost(base, 10)).toBe(profTen);
    expect(() => staminaAbilityCost(-1, 1)).toThrow(RangeError);
  });
});
