import { describe, expect, it } from 'vitest';
import golden from './__golden__/encumbrance.json' with { type: 'json' };
import {
  encumbranceCanDash,
  encumbranceCanMove,
  encumbranceDashCostMult,
  encumbranceEffects,
  encumbranceMoveMult,
  encumbranceRatio,
  encumbranceTier,
} from './encumbrance.js';

describe('encumbrance bands', () => {
  it.each(golden.bands)('$name', ({ ratio, tier, moveMult, dashCostMult, canMove }) => {
    const found = encumbranceTier(ratio);
    expect(found).toBe(tier);
    expect(encumbranceMoveMult(found)).toBe(moveMult);
    expect(encumbranceDashCostMult(found)).toBe(dashCostMult);
    expect(encumbranceCanDash(found)).toBe(dashCostMult !== null);
    expect(encumbranceCanMove(found)).toBe(canMove);
  });

  it('carrying nothing is normal', () => {
    expect(encumbranceTier(0)).toBe(0);
  });

  it.each([-0.1, Number.NaN])('rejects ratio %s', (ratio) => {
    expect(() => encumbranceTier(ratio)).toThrow(RangeError);
  });
});

describe('encumbrance ratio', () => {
  it('divides the carried weight by the capacity', () => {
    expect(encumbranceRatio(55, 55)).toBe(1);
    expect(encumbranceRatio(66, 55)).toBeCloseTo(1.2, 4);
  });

  it.each([0, -5])('rejects capacity %s', (capacity) => {
    expect(() => encumbranceRatio(10, capacity)).toThrow(RangeError);
  });

  it('rejects negative weight', () => {
    expect(() => encumbranceRatio(-1, 55)).toThrow(RangeError);
  });
});

describe('encumbrance effects from weight', () => {
  it('a starting character at exactly full capacity moves normally', () => {
    expect(encumbranceEffects(55, 55)).toEqual({
      ratio: 1,
      tier: 0,
      moveMult: 1,
      dashCostMult: 1,
      canDash: true,
      canMove: true,
    });
  });

  it('a heavy load slows movement and blocks dashing', () => {
    expect(encumbranceEffects(80, 55)).toMatchObject({
      tier: 2,
      moveMult: 0.5,
      dashCostMult: null,
      canDash: false,
      canMove: true,
    });
  });

  it('an overload stops movement', () => {
    expect(encumbranceEffects(90, 55)).toMatchObject({ tier: 3, moveMult: 0, canMove: false });
  });
});

describe('encumbrance tier guard', () => {
  it('rejects a tier outside the table', () => {
    expect(() => encumbranceMoveMult(4 as 3)).toThrow(RangeError);
  });
});
