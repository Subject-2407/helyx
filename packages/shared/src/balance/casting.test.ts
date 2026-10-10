import { describe, expect, it } from 'vitest';
import golden from './__golden__/casting.json' with { type: 'json' };
import {
  canOvercharge,
  canSyncCast,
  castModeMult,
  effectiveSync,
  forceManaCost,
  forcePower,
  MIN_SYNC_TO_CAST,
  staminaAbilityCost,
  syncDissonanceCost,
  syncEffectBonus,
  syncInterruptDissonance,
  syncPower,
  syncWindupPenaltyS,
} from './casting.js';
import type { AspectTag } from './counter.js';

const { ability, resonance } = golden;
const TAGS = ability.tags as readonly AspectTag[];

describe('casting worked example', () => {
  describe.each(golden.rows)('$name', (row) => {
    it('averages attunement over the tags', () => {
      expect(effectiveSync(row.sync, TAGS, true)).toBeCloseTo(row.s, 4);
    });

    it('charges the expected mana', () => {
      expect(forceManaCost(ability.baseMana, row.s, ability.prof, false)).toBe(row.mana);
    });

    it('gives the expected effect bonus', () => {
      expect(syncEffectBonus(row.s)).toBeCloseTo(row.effect, 4);
    });

    it('allows the second mode only with enough attunement', () => {
      expect(canSyncCast(row.sync, TAGS, true)).toBe(row.dissonance !== null);
    });

    it('charges the expected interference and gives the expected power', () => {
      if (row.dissonance === null || row.power === null) {
        return;
      }
      expect(syncDissonanceCost(ability.baseDissonance, row.s, ability.prof)).toBe(row.dissonance);
      expect(syncPower(row.s, resonance.neutral)).toBeCloseTo(row.power.neutral, 4);
      expect(syncPower(row.s, resonance.friendly)).toBeCloseTo(row.power.friendly, 4);
      expect(syncPower(row.s, resonance.hostile)).toBeCloseTo(row.power.hostile, 4);
    });
  });
});

describe('casting rules', () => {
  it('treats a caster who has not started listening as having no attunement', () => {
    const hidden = { change: 61, force: 77 };
    const s = effectiveSync(hidden, TAGS, false);
    expect(s).toBe(0);
    expect(forceManaCost(ability.baseMana, s, ability.prof, false)).toBe(18);
    expect(syncEffectBonus(s)).toBe(1);
    expect(canSyncCast(hidden, TAGS, false)).toBe(false);
  });

  it('counts missing attunement as zero and needs every tag above the minimum', () => {
    expect(effectiveSync({ change: 40 }, TAGS, true)).toBeCloseTo(20, 4);
    expect(effectiveSync({ change: 40 }, [], true)).toBe(0);
    expect(canSyncCast({ change: 40, force: 4.999 }, TAGS, true)).toBe(false);
    expect(canSyncCast({ change: 40, force: MIN_SYNC_TO_CAST }, TAGS, true)).toBe(true);
    expect(canSyncCast({ change: 40 }, [], true)).toBe(false);
    expect(MIN_SYNC_TO_CAST).toBe(golden.minSyncToCast);
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

  it('applies the proficiency cost reduction to both resources', () => {
    expect(forceManaCost(ability.baseMana, 0, 10, false)).toBe(golden.proficiencyTen.mana);
    expect(syncDissonanceCost(ability.baseDissonance, 0, 10)).toBe(
      golden.proficiencyTen.dissonance,
    );
  });

  it('clamps power at both ends', () => {
    expect(syncPower(100, 1)).toBeCloseTo(golden.powerCeiling, 4);
    expect(syncPower(0, -1)).toBeCloseTo(golden.powerFloor, 4);
  });

  it('rejects attunement and resonance outside their ranges', () => {
    expect(() => syncEffectBonus(101)).toThrow(RangeError);
    expect(() => syncPower(50, 1.5)).toThrow(RangeError);
    expect(() => forceManaCost(-1, 0, 1, false)).toThrow(RangeError);
  });

  it('picks the power multiplier of each mode', () => {
    expect(castModeMult({ kind: 'physical' })).toBe(1);
    expect(castModeMult({ kind: 'force', overcharge: false })).toBe(1);
    expect(castModeMult({ kind: 'force', overcharge: true })).toBe(1.25);
    expect(castModeMult({ kind: 'sync', s: 69, rbar: 0 })).toBeCloseTo(0.9915, 4);
  });

  it('exposes the second-mode wind-up and interrupt penalties', () => {
    expect(syncWindupPenaltyS()).toBe(golden.windupPenaltyS);
    expect(syncInterruptDissonance()).toBe(golden.interruptDissonance);
  });

  it('reduces physical stamina costs with proficiency', () => {
    expect(staminaAbilityCost(20, 1)).toBe(20);
    expect(staminaAbilityCost(20, 10)).toBe(16);
  });
});
