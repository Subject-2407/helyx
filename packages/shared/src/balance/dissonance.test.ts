import { describe, expect, it } from 'vitest';
import { SequenceRng } from '../rng/rng.js';
import { createSfc32 } from '../rng/sfc32.js';
import { SEED_A } from '../testing/seeds.js';
import type { Aspect } from '../types/aspect.js';
import golden from './__golden__/dissonance.json' with { type: 'json' };
import {
  addStrain,
  applyDissonance,
  clampDissonance,
  decayDissonance,
  dissonanceDamageTakenMult,
  dissonanceDecayPerS,
  dissonanceState,
  jarringStrain,
  misfireTags,
  unboundOutcome,
} from './dissonance.js';

const FIRE_SLASH: readonly Aspect[] = ['change', 'force'];

describe('strain decay', () => {
  const { wis, perS, delayS } = golden.decay;

  it('decays from wisdom once the delay has passed', () => {
    expect(dissonanceDecayPerS({ wis, inCombat: true, sinceStrainS: delayS })).toBeCloseTo(perS, 4);
    expect(dissonanceDecayPerS({ wis, inCombat: true, sinceStrainS: delayS - 0.01 })).toBe(0);
  });

  it('doubles out of combat and applies passive bonuses', () => {
    expect(dissonanceDecayPerS({ wis, inCombat: false, sinceStrainS: 5 })).toBeCloseTo(
      golden.decay.outOfCombatPerS,
      4,
    );
    const passive = { wis, inCombat: true, sinceStrainS: 5, passiveMult: golden.decay.passiveMult };
    expect(dissonanceDecayPerS(passive)).toBeCloseTo(golden.decay.passivePerS, 4);
  });

  it('lowers the meter over time without going below zero', () => {
    expect(decayDissonance(50, 2, { wis, inCombat: true, sinceStrainS: 5 })).toBe(39.5);
    expect(decayDissonance(3, 2, { wis, inCombat: true, sinceStrainS: 5 })).toBe(0);
    expect(() => decayDissonance(3, -1, { wis, inCombat: true, sinceStrainS: 5 })).toThrow(
      RangeError,
    );
    expect(() => dissonanceDecayPerS({ wis, inCombat: true, sinceStrainS: -1 })).toThrow(
      RangeError,
    );
  });
});

describe('strain bands', () => {
  it.each(golden.states)('$value is $state', ({ value, state }) => {
    expect(dissonanceState(value)).toBe(state);
  });

  it('adds damage taken from the distorted band upward', () => {
    expect(dissonanceDamageTakenMult(69.9)).toBe(1);
    expect(dissonanceDamageTakenMult(70)).toBeCloseTo(golden.distortedDamageTaken, 6);
  });
});

describe('meter arithmetic', () => {
  it('keeps one decimal and stays inside the meter', () => {
    expect(clampDissonance(25.79)).toBe(25.8);
    expect(clampDissonance(140)).toBe(100);
    expect(() => clampDissonance(Number.NaN)).toThrow(RangeError);
  });

  it('floors a clarity draught at zero', () => {
    expect(applyDissonance(12, golden.clarityDraught)).toBe(0);
    expect(applyDissonance(45.5, golden.clarityDraught)).toBe(15.5);
  });
});

describe('misfire', () => {
  it('never misfires below the fraying band and draws nothing there', () => {
    const rng = new SequenceRng([0]);
    expect(misfireTags(89.9, FIRE_SLASH, rng)).toBe(FIRE_SLASH);
  });

  it('misfires at its rate from the fraying band, into one random Aspect', () => {
    const rng = createSfc32(SEED_A);
    let misfires = 0;
    for (let cast = 0; cast < golden.misfire.casts; cast += 1) {
      const tags = misfireTags(95, FIRE_SLASH, rng);
      if (tags !== FIRE_SLASH) {
        misfires += 1;
        expect(tags).toHaveLength(1);
      }
    }
    const rate = misfires / golden.misfire.casts;
    expect(Math.abs(rate - golden.misfire.rate)).toBeLessThan(golden.misfire.tolerance);
  });
});

describe('breaking loose', () => {
  it('staggers, deals true damage and resets the meter', () => {
    const { maxHp, staggerS, hpLoss, reset } = golden.unbound;
    expect(unboundOutcome(maxHp)).toEqual({ staggerS, hpLoss, reset });
    expect(addStrain(95, 10, maxHp)).toEqual({
      value: reset,
      unbound: { staggerS, hpLoss, reset },
    });
    expect(addStrain(80, 10, maxHp)).toEqual({ value: 90 });
  });

  it('only jars Listeners', () => {
    expect(jarringStrain(4, true)).toBe(4);
    expect(jarringStrain(4, false)).toBe(0);
    expect(() => jarringStrain(-1, true)).toThrow(RangeError);
  });
});
