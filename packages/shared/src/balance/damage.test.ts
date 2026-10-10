import { describe, expect, it } from 'vitest';
import { SequenceRng, U32_MAX, unitFromU32, type Rng } from '../rng/rng.js';
import golden from './__golden__/damage.json' with { type: 'json' };
import type { AspectProfile, AspectTag } from './counter.js';
import {
  applyCrit,
  applyEffectBonus,
  applyModeMult,
  applyProficiency,
  applyPvpScale,
  applyTargetMods,
  aspectPart,
  computeHeal,
  computeHit,
  finalizeDamage,
  mitigation,
  mixParts,
  physPart,
  rawDamage,
  resistMean,
  taggedPortion,
  targetModsMult,
  varianceFactor,
  type DamageSource,
  type HitInput,
} from './damage.js';

/** Seed every randomized test in this package starts from, so failures replay exactly. */
const SEED_A = 0x48454c59;

/**
 * Small seeded sfc32 generator for this suite. The shared generator replaces it once the
 * package exposes one; the stream only needs to be deterministic and well spread here.
 */
function sfc32(seed: number): Rng {
  let a = 0x9e3779b9;
  let b = 0x243f6a88;
  let c = 0xb7e15162;
  let d = seed >>> 0;
  const nextU32 = (): number => {
    const t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) | 0;
    return t >>> 0;
  };
  for (let round = 0; round < 12; round += 1) {
    nextU32();
  }
  return { nextU32, next: () => unitFromU32(nextU32()) };
}

const CASE = golden.orderCase;
const F = CASE.factors;

function orderInput(overrides: Partial<HitInput> = {}): HitInput {
  return {
    damage: CASE.damage,
    powers: CASE.powers,
    prof: CASE.prof,
    effectBonus: CASE.effectBonus,
    modeMult: CASE.modeMult,
    critChance: CASE.critChance,
    critDamage: CASE.critDamage,
    attackerLevel: CASE.attackerLevel,
    attackerIsPlayer: true,
    targetIsPlayer: true,
    targetDef: CASE.targetDef,
    p: CASE.p,
    tags: CASE.tags as readonly AspectTag[],
    targetProfile: CASE.targetProfile as AspectProfile,
    targetResists: CASE.targetResists,
    targetMods: CASE.targetMods,
    ...overrides,
  };
}

/** A roll of 0 always crits; a mid roll gives a variance factor of exactly 1 (up to float). */
const CRIT_THEN_MID = (): Rng => new SequenceRng([0, 2 ** 31]);

describe('damage pipeline', () => {
  it('multiplies every step in order and rounds only at the end', () => {
    const result = computeHit(orderInput(), CRIT_THEN_MID());
    const mixed = 1 - CASE.p + CASE.p * F.counter * (1 - F.resist);
    const expected =
      F.raw * F.prof * F.effect * F.mode * F.crit * F.mitigation * mixed * F.targetMods * F.pvp;
    expect(varianceFactor(new SequenceRng([2 ** 31]))).toBe(1);
    expect(result.crit).toBe(true);
    expect(result.unrounded).toBeCloseTo(expected, 6);
    expect(result.damage).toBe(Math.round(expected));
  });

  it('matches the step functions applied one after another', () => {
    const input = orderInput();
    let value = rawDamage(input.damage, input.powers);
    expect(value).toBeCloseTo(F.raw, 6);
    value = applyProficiency(value, input.prof);
    value = applyEffectBonus(value, input.effectBonus, input.tags);
    value = applyModeMult(value, input.modeMult);
    value = applyCrit(value, true, input.critDamage);
    const mit = mitigation(input.targetDef, input.attackerLevel);
    expect(mit).toBeCloseTo(F.mitigation, 6);
    const rbar = resistMean(input.targetResists, input.tags);
    expect(rbar).toBeCloseTo(F.resist, 6);
    const aspect = aspectPart(input.p, input.tags, input.targetProfile, rbar);
    expect(aspect).toBeCloseTo(F.counter * (1 - F.resist), 6);
    value = mixParts(value, mit, physPart(input.p), aspect);
    value = applyTargetMods(value, input.targetMods ?? 1);
    value = applyPvpScale(value, true, true);
    value = value * varianceFactor(new SequenceRng([2 ** 31]));
    expect(computeHit(input, CRIT_THEN_MID()).unrounded).toBeCloseTo(value, 6);
    expect(finalizeDamage(value, false)).toBe(Math.round(value));
  });

  it('does not round between steps', () => {
    const input = orderInput({
      damage: { base: 10.4, atk: 0, apw: 0 },
      prof: 1,
      effectBonus: 1,
      modeMult: 1.2,
      critChance: 0,
      targetDef: 0,
      p: 0,
      tags: [],
      targetMods: 1.2,
      attackerIsPlayer: false,
    });
    const result = computeHit(input);
    expect(result.unrounded).toBeCloseTo(10.4 * 1.2 * 1.2, 6);
    expect(result.damage).toBe(15);
    expect(Math.round(Math.round(10.4 * 1.2) * 1.2)).toBe(14);
  });

  it('keeps variance within five percent with a mean of one', () => {
    const { draws, min, max, mean, meanTolerance } = golden.variance;
    const rng = sfc32(SEED_A);
    let total = 0;
    let low = Infinity;
    let high = -Infinity;
    for (let i = 0; i < draws; i += 1) {
      const factor = varianceFactor(rng);
      total += factor;
      low = Math.min(low, factor);
      high = Math.max(high, factor);
    }
    expect(low).toBeGreaterThanOrEqual(min);
    expect(high).toBeLessThanOrEqual(max);
    expect(Math.abs(total / draws - mean)).toBeLessThanOrEqual(meanTolerance);
    expect(varianceFactor(new SequenceRng([0]))).toBeCloseTo(min, 6);
    expect(varianceFactor(new SequenceRng([U32_MAX]))).toBeCloseTo(max, 6);
  });

  it('scales only player against player hits', () => {
    const base = orderInput({ critChance: 0 });
    const both = computeHit(base).unrounded;
    const pveOut = computeHit({ ...base, targetIsPlayer: false }).unrounded;
    const pveIn = computeHit({ ...base, attackerIsPlayer: false }).unrounded;
    expect(both).toBeCloseTo(pveOut * golden.pvpScale, 6);
    expect(pveIn).toBeCloseTo(pveOut, 6);
  });

  it('ignores counters, resists and the effect bonus for physical hits', () => {
    const physical = orderInput({ p: 0, tags: [], critChance: 0 });
    const shielded = {
      ...physical,
      targetProfile: { primary: 'void', vulnerable: ['force'] } as AspectProfile,
      targetResists: { change: 0.6, force: 0.6 },
    };
    expect(computeHit(physical).unrounded).toBeCloseTo(computeHit(shielded).unrounded, 6);
    expect(applyEffectBonus(10, 1.15, [])).toBe(10);
    expect(aspectPart(0, ['change'], { primary: 'order' }, 0)).toBe(0);
  });

  it('never crits on damage over time and never without a random source', () => {
    const always = orderInput({ critChance: 1 });
    expect(computeHit({ ...always, isDotTick: true }, new SequenceRng([0])).crit).toBe(false);
    expect(computeHit(always).crit).toBe(false);
    expect(computeHit(orderInput({ critChance: 0 }), new SequenceRng([0])).crit).toBe(false);
  });

  it('deals at least one point unless the target is fully immune', () => {
    const tiny = orderInput({ damage: { base: 0.01, atk: 0, apw: 0 }, critChance: 0 });
    expect(computeHit(tiny).damage).toBe(1);
    expect(computeHit({ ...tiny, immune: true }).damage).toBe(0);
    expect(finalizeDamage(0.2, false)).toBe(1);
    expect(finalizeDamage(1234.5, true)).toBe(0);
  });

  it('combines target modifiers by multiplying them', () => {
    expect(targetModsMult({})).toBe(1);
    expect(targetModsMult({ exposed: true, weakened: true, extra: [1.1, 0.4] })).toBeCloseTo(
      1.15 * 0.85 * 1.1 * 0.4,
      6,
    );
  });

  it('averages resist over the tags and counts missing ones as zero', () => {
    expect(resistMean({ order: 0.25 }, ['order', 'force'])).toBeCloseTo(0.125, 6);
    expect(resistMean({ order: 0.25 }, [])).toBe(0);
  });

  it('rejects out-of-range inputs', () => {
    expect(() => computeHit(orderInput({ p: 1.5 }))).toThrow(RangeError);
    expect(() => computeHit(orderInput({ critChance: -0.1 }))).toThrow(RangeError);
    expect(() => taggedPortion({ kind: 'monster', tags: ['void'], p: 2 })).toThrow(RangeError);
  });
});

describe('tagged portion', () => {
  it.each(golden.taggedPortion)('$name', ({ source, p }) => {
    expect(taggedPortion(source as DamageSource)).toBeCloseTo(p, 6);
  });
});

describe('healing', () => {
  it('scales with aspect power, proficiency, effect bonus and mode without mitigation', () => {
    const h = golden.heal;
    const result = computeHeal(h);
    expect(result).toEqual({ heal: h.expected, crit: false });
  });

  it('crits only when the ability allows it', () => {
    const h = golden.heal;
    const allowed = computeHeal({ ...h, crit: { chance: 1, damage: 1.5 } }, new SequenceRng([0]));
    expect(allowed).toEqual({ heal: Math.round(38.16 * 1.5), crit: true });
    expect(computeHeal(h, new SequenceRng([0])).crit).toBe(false);
  });
});
