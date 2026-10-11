import { describe, expect, it } from 'vitest';
import type { Aspect } from '../../types/aspect.js';
import { canOvercharge, castModeMult, forceManaCost } from '../casting.js';
import golden from './__golden__/cast.json' with { type: 'json' };
import {
  attunedManaFactor,
  canSyncCast,
  effectiveSync,
  MIN_SYNC_TO_CAST,
  syncDissonanceCost,
  syncEffectBonus,
  syncInterruptDissonance,
  syncPower,
  syncWindupPenaltyS,
} from './sync.js';

const { ability, resonance } = golden;
const TAGS = ability.tags as readonly Aspect[];

/** Mana a force-mode cast of the example ability costs at attunement `s`. */
function manaAt(s: number, prof = ability.prof): number {
  return forceManaCost(ability.baseMana, attunedManaFactor(s), prof, false);
}

describe('second cast mode worked example', () => {
  describe.each(golden.rows)('$name', (row) => {
    it('averages attunement over the tags', () => {
      expect(effectiveSync(row.sync, TAGS, true)).toBeCloseTo(row.s, 4);
    });

    it('charges the expected mana in the force mode', () => {
      expect(manaAt(row.s)).toBe(row.mana);
    });

    it('gives the expected effect bonus', () => {
      expect(syncEffectBonus(row.s)).toBeCloseTo(row.effect, 4);
    });

    it('allows the mode only with enough attunement', () => {
      expect(canSyncCast(row.sync, TAGS, true)).toBe(row.dissonance !== null);
    });

    it('charges the expected strain and gives the expected power', () => {
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

describe('second cast mode rules', () => {
  it('treats a caster who has not started listening as having no attunement', () => {
    const hidden = { change: 61, force: 77 };
    const s = effectiveSync(hidden, TAGS, false);
    expect(s).toBe(0);
    expect(attunedManaFactor(s)).toBe(1);
    expect(manaAt(s)).toBe(golden.rows[0]?.mana);
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

  it('applies the proficiency cost reduction to mana and strain', () => {
    expect(manaAt(0, golden.proficiencyTen.prof)).toBe(golden.proficiencyTen.mana);
    expect(syncDissonanceCost(ability.baseDissonance, 0, golden.proficiencyTen.prof)).toBe(
      golden.proficiencyTen.dissonance,
    );
  });

  it('never overcharges in the second mode', () => {
    expect(canOvercharge({ mode: 'scaled', overchargeable: true, holdS: 1 })).toBe(false);
  });

  it('clamps power at both ends', () => {
    expect(syncPower(100, 1)).toBeCloseTo(golden.powerCeiling, 4);
    expect(syncPower(0, -1)).toBeCloseTo(golden.powerFloor, 4);
  });

  it('rejects attunement and resonance outside their ranges', () => {
    expect(() => syncEffectBonus(101)).toThrow(RangeError);
    expect(() => attunedManaFactor(101)).toThrow(RangeError);
    expect(() => attunedManaFactor(-1)).toThrow(RangeError);
    expect(() => syncPower(50, 1.5)).toThrow(RangeError);
    expect(() => syncDissonanceCost(-1, 0, 1)).toThrow(RangeError);
  });

  it('feeds its power into the cast mode multiplier', () => {
    const power = syncPower(69, resonance.neutral);
    expect(castModeMult({ kind: 'scaled', power })).toBeCloseTo(
      golden.rows[3]?.power?.neutral ?? 0,
      4,
    );
  });

  it('exposes the wind-up and interrupt penalties', () => {
    expect(syncWindupPenaltyS()).toBe(golden.windupPenaltyS);
    expect(syncInterruptDissonance()).toBe(golden.interruptDissonance);
  });
});
