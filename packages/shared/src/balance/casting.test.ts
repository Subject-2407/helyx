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

describe('casting worked example', () => {
  it.each(golden.rows)('$name charges the expected mana', (row) => {
    expect(forceManaCost(ability.baseMana, row.s, ability.prof, false)).toBe(row.mana);
  });
});

describe('force casting rules', () => {
  it('charges full mana when the caster brings no attunement', () => {
    expect(forceManaCost(ability.baseMana, 0, ability.prof, false)).toBe(18);
  });

  it('makes overcharge cost more and hit harder', () => {
    expect(forceManaCost(ability.baseMana, 0, 1, true)).toBe(golden.overcharge.mana);
    expect(forcePower(true)).toBe(golden.overcharge.power);
    expect(forcePower(false)).toBe(1);
  });

  it('allows overcharge only for able abilities, in the first mode, after a long enough hold', () => {
    const holdS = golden.overcharge.holdS;
    expect(canOvercharge({ mode: 'force', overchargeable: true, holdS })).toBe(true);
    expect(canOvercharge({ mode: 'force', overchargeable: true, holdS: holdS - 0.01 })).toBe(false);
    expect(canOvercharge({ mode: 'force', overchargeable: false, holdS: 1 })).toBe(false);
    expect(canOvercharge({ mode: 'sync', overchargeable: true, holdS: 1 })).toBe(false);
  });

  it('applies the proficiency cost reduction to mana', () => {
    expect(forceManaCost(ability.baseMana, 0, 10, false)).toBe(golden.proficiencyTen.mana);
  });

  it('rejects costs and attunement outside their ranges', () => {
    expect(() => forceManaCost(-1, 0, 1, false)).toThrow(RangeError);
    expect(() => forceManaCost(18, 101, 1, false)).toThrow(RangeError);
  });

  it('picks the power multiplier of each mode', () => {
    expect(castModeMult({ kind: 'physical' })).toBe(1);
    expect(castModeMult({ kind: 'force', overcharge: false })).toBe(1);
    expect(castModeMult({ kind: 'force', overcharge: true })).toBe(1.25);
    expect(castModeMult({ kind: 'sync', power: 0.9915 })).toBe(0.9915);
    expect(() => castModeMult({ kind: 'sync', power: -1 })).toThrow(RangeError);
  });

  it('reduces physical stamina costs with proficiency', () => {
    expect(staminaAbilityCost(20, 1)).toBe(20);
    expect(staminaAbilityCost(20, 10)).toBe(16);
    expect(() => staminaAbilityCost(-1, 1)).toThrow(RangeError);
  });
});
