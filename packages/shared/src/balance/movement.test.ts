import { describe, expect, it } from 'vitest';
import type { EncumbranceTier } from '../types/combat.js';
import golden from './__golden__/movement.json' with { type: 'json' };
import {
  actionMoveMult,
  blockDamageMult,
  blockHoldDrain,
  blockStaminaCost,
  currentStaminaRegenPerS,
  dashCost,
  dashCostParam,
  dashInvulnerable,
  dashSpeedPxS,
  dashTimings,
  isInBlockArc,
  parryOutcome,
  resolveBlockedHit,
  staminaRegenPerS,
  type ActionPhase,
} from './movement.js';

describe('dash cost', () => {
  it.each(golden.dashCost)('$name', ({ agi, tier, expected }) => {
    const cost = dashCost(agi, tier as EncumbranceTier);
    if (expected === null) {
      expect(cost).toBeNull();
      expect(dashCostParam(agi, tier as EncumbranceTier)).toBe(Number.POSITIVE_INFINITY);
    } else {
      expect(cost).toBeCloseTo(expected, 4);
      expect(dashCostParam(agi, tier as EncumbranceTier)).toBeCloseTo(expected, 4);
    }
  });
});

describe('stamina regeneration', () => {
  const { agi, perS, delayS } = golden.staminaRegen;

  it('regenerates from agility', () => {
    expect(staminaRegenPerS(agi)).toBeCloseTo(perS, 4);
  });

  it('waits after spending and stops while guarding', () => {
    expect(currentStaminaRegenPerS(agi, delayS - 0.01, false)).toBe(0);
    expect(currentStaminaRegenPerS(agi, delayS, false)).toBeCloseTo(perS, 4);
    expect(currentStaminaRegenPerS(agi, 10, true)).toBe(0);
    expect(() => currentStaminaRegenPerS(agi, -1, false)).toThrow(RangeError);
  });
});

describe('dash', () => {
  it('covers its distance over its duration', () => {
    expect(dashSpeedPxS()).toBeCloseTo(golden.dash.speedPxS, 6);
  });

  it('has the expected timings', () => {
    const timings = dashTimings();
    expect(timings.durationMs).toBeCloseTo(golden.dash.durationMs, 6);
    expect(timings.cooldownMs).toBeCloseTo(golden.dash.cooldownMs, 6);
    expect(timings.iframeMs).toBeCloseTo(golden.dash.iframeMs, 6);
    expect(timings.staminaDelayMs).toBeCloseTo(golden.dash.staminaDelayMs, 6);
  });

  it('is invulnerable only during its first frames', () => {
    expect(dashInvulnerable(0)).toBe(true);
    expect(dashInvulnerable(0.139)).toBe(true);
    expect(dashInvulnerable(0.14)).toBe(false);
    expect(dashInvulnerable(-0.01)).toBe(false);
  });
});

describe('move multipliers while acting', () => {
  it.each(Object.entries(golden.moveMult))('%s', (phase, expected) => {
    expect(actionMoveMult(phase as ActionPhase)).toBe(expected);
  });

  it('lets data override the default', () => {
    expect(actionMoveMult('windup', 0.2)).toBe(0.2);
    expect(() => actionMoveMult('windup', -1)).toThrow(RangeError);
  });
});

describe('basic block', () => {
  it('reduces damage, more with a shield', () => {
    expect(blockDamageMult(false)).toBe(golden.block.damageMult);
    expect(blockDamageMult(true)).toBe(golden.block.shieldDamageMult);
  });

  it.each(golden.block.hits)('$name drains the expected stamina', (hit) => {
    expect(blockStaminaCost(hit.raw, hit.maxHp, hit.shield)).toBeCloseTo(hit.expected, 4);
  });

  it('drains stamina while held', () => {
    expect(blockHoldDrain(2.5)).toBeCloseTo(golden.block.drainPerS * 2.5, 6);
    expect(() => blockHoldDrain(-1)).toThrow(RangeError);
  });

  it('rejects impossible hits', () => {
    expect(() => blockStaminaCost(-1, 100, false)).toThrow(RangeError);
    expect(() => blockStaminaCost(10, 0, false)).toThrow(RangeError);
  });

  it('breaks the guard and stuns when stamina runs out', () => {
    const held = resolveBlockedHit(50, 30, 120, false);
    expect(held).toEqual({ damageMult: 0.4, stamina: 30, guardBreak: false, stunS: 0 });
    const broken = resolveBlockedHit(15, 30, 120, false);
    expect(broken.guardBreak).toBe(true);
    expect(broken.stamina).toBe(0);
    expect(broken.stunS).toBe(golden.block.guardBreakStunS);
  });

  it('only guards the front half', () => {
    expect(isInBlockArc(0)).toBe(true);
    expect(isInBlockArc(90)).toBe(true);
    expect(isInBlockArc(-90)).toBe(true);
    expect(isInBlockArc(91)).toBe(false);
    expect(isInBlockArc(180)).toBe(false);
    expect(isInBlockArc(350)).toBe(true);
  });
});

describe('parry', () => {
  it('parries inside the window without refunding mana', () => {
    expect(parryOutcome(golden.parry.windowS)).toEqual({
      kind: 'parry',
      damage: 0,
      attackerStaggerS: golden.parry.staggerS,
      attackerExposedS: golden.parry.exposedS,
      manaRefund: 0,
    });
  });

  it('falls back to a block after the window', () => {
    expect(parryOutcome(golden.parry.windowS + 0.01)).toEqual({ kind: 'block' });
    expect(() => parryOutcome(-0.1)).toThrow(RangeError);
  });
});
