import { describe, expect, it } from 'vitest';
import { SequenceRng, U32_MAX } from '../rng/rng.js';
import golden from './__golden__/sync.json' with { type: 'json' };
import { floorTo } from './math.js';
import {
  applySyncGain,
  calmReward,
  canAskExile,
  canHearHum,
  castsToReach,
  edgeTriggerEligible,
  exileFee,
  isCircuitComplete,
  isFolioLegible,
  isQualifyingCast,
  releaseSync,
  rollEdgeTrigger,
  routeFlatGain,
  siteSyncGain,
  stoneChannelS,
  storeSync,
  syncCap,
  syncEcho,
  syncEchoVector,
  syncTier,
  syncUseGain,
  totalSync,
} from './sync.js';

/** Climbs from 0 with single-tag casts, storing each step with `store`, until `target`. */
function climb(target: number, growthMult: number, store: (x: number) => number, limit: number) {
  let value = 0;
  let casts = 0;
  while (value < target && casts < limit) {
    value = store(value + syncUseGain(value, growthMult, 1));
    casts += 1;
  }
  return { value, casts };
}

describe('use-based growth', () => {
  it('gains the expected amount and stores six decimals', () => {
    const { current, growthMult, tags, delta, stored } = golden.useGain;
    expect(syncUseGain(current, growthMult, tags)).toBeCloseTo(delta, 10);
    expect(storeSync(syncUseGain(current, growthMult, tags))).toBe(stored);
    expect(syncUseGain(current, growthMult, 2)).toBeCloseTo(delta / 2, 10);
  });

  it.each(golden.effort)('$name takes about $casts casts', ({ target, growthMult, casts }) => {
    expect(Math.abs(castsToReach(target, growthMult) / casts - 1)).toBeLessThan(0.005);
  });

  it('climbs to thirty in the expected number of stored steps', () => {
    const { growthMult, target, casts } = golden.discrete;
    expect(climb(target, growthMult, storeSync, casts * 2).casts).toBe(casts);
  });

  it('would stall if stored with only two decimals, so storage keeps six', () => {
    const { growthMult, target, coarseStall } = golden.discrete;
    const coarse = climb(target, growthMult, (x) => floorTo(x, 2), 20_000);
    expect(coarse.value).toBe(coarseStall);
    expect(storeSync(0.0000015)).toBe(0.000001);
  });

  it('rejects impossible inputs', () => {
    expect(() => syncUseGain(101, 1, 1)).toThrow(RangeError);
    expect(() => syncUseGain(10, 1, 0)).toThrow(RangeError);
    expect(() => castsToReach(100, 1)).toThrow(RangeError);
  });
});

describe('qualifying casts', () => {
  const base = {
    hitHostileMonster: true,
    targetLevel: 5,
    casterLevel: 10,
    isPvp: false,
    sinceLastGainS: undefined,
  };

  it('counts hits on monsters at most five levels below the caster', () => {
    expect(isQualifyingCast(base)).toBe(true);
    expect(isQualifyingCast({ ...base, targetLevel: 4 })).toBe(false);
    expect(isQualifyingCast({ ...base, hitHostileMonster: false })).toBe(false);
  });

  it('never counts player hits and waits between gains of one ability', () => {
    expect(isQualifyingCast({ ...base, isPvp: true })).toBe(false);
    expect(isQualifyingCast({ ...base, sinceLastGainS: 1.99 })).toBe(false);
    expect(isQualifyingCast({ ...base, sinceLastGainS: 2 })).toBe(true);
  });
});

describe('site gain and the cap', () => {
  it('gains from a site with wisdom', () => {
    const { base, current, wis, gain } = golden.site;
    expect(siteSyncGain(base, current, wis)).toBeCloseTo(gain, 6);
    expect(() => siteSyncGain(-1, 0, 5)).toThrow(RangeError);
  });

  it('raises the cap per trial up to its maximum', () => {
    for (const { trials, cap } of golden.capProgression) {
      expect(syncCap(trials)).toBe(cap);
    }
  });

  it('cuts a gain that would cross the cap', () => {
    const { others, aspect, delta, cap, applied } = golden.cap;
    const sync = { growth: aspect, order: others };
    const result = applySyncGain(sync, 'growth', delta, cap);
    expect(result.applied).toBeCloseTo(applied, 6);
    expect(result.truncated).toBe(true);
    expect(totalSync(result.next)).toBeCloseTo(cap, 6);
  });

  it('applies a gain that fits and never passes the per-Aspect maximum', () => {
    expect(applySyncGain({ growth: 10 }, 'growth', 0.0060025, 120)).toEqual({
      next: { growth: 10.006002 },
      applied: expect.closeTo(0.006002, 9) as number,
      truncated: false,
    });
    expect(applySyncGain({ growth: 99.9 }, 'growth', 1, 300).next.growth).toBe(100);
  });

  it('releases attunement for good', () => {
    expect(releaseSync({ order: 40 }, 'order', 15)).toEqual({ order: 25 });
    expect(() => releaseSync({ order: 4 }, 'order', 5)).toThrow(RangeError);
  });
});

describe('echo and tiers', () => {
  it('passes a tenth on, floored to two decimals, and nothing for an Outlaw', () => {
    expect(syncEcho(golden.echo.old, false)).toBe(golden.echo.echo);
    expect(syncEcho(golden.echo.old, true)).toBe(0);
    expect(syncEchoVector({ growth: golden.echo.old, void: 10 }, false)).toEqual({
      growth: golden.echo.echo,
      void: 1,
    });
  });

  it.each(golden.tiers)('$value is $tier', ({ value, tier }) => {
    expect(syncTier(value)).toBe(tier);
  });
});

describe('before listening', () => {
  it('gives calm instead of attunement at a site', () => {
    expect(calmReward()).toEqual(golden.calm);
  });

  it('accrues use-based gains from the hidden values with the same formula and cap', () => {
    const hidden = { change: 61, force: 77 };
    const gain = syncUseGain(61, 1.225, 2);
    expect(applySyncGain(hidden, 'change', gain, syncCap(12)).applied).toBeCloseTo(
      storeSync(61 + gain) - 61,
      9,
    );
  });

  it('banks book and quest gains until listening', () => {
    expect(routeFlatGain(2, true)).toEqual({ grant: 2, bank: 0 });
    expect(routeFlatGain(2, false)).toEqual({ grant: 0, bank: 2 });
  });

  it('checks the ways to start listening', () => {
    expect(isFolioLegible(true, 0)).toBe(true);
    expect(isFolioLegible(false, 14.9)).toBe(false);
    expect(isFolioLegible(false, 15)).toBe(true);
    expect(canAskExile({ hiddenTotal: 10, karma: 0, coins: 500 })).toBe(true);
    expect(canAskExile({ hiddenTotal: 10, karma: -1, coins: 500 })).toBe(false);
    expect(canAskExile({ hiddenTotal: 9.9, karma: 0, coins: 500 })).toBe(false);
    expect(canAskExile({ hiddenTotal: 10, karma: 0, coins: 499 })).toBe(false);
    expect(exileFee()).toBe(500);
    expect(canHearHum(6, 1)).toBe(true);
    expect(canHearHum(5, 2)).toBe(false);
    expect(canHearHum(6, 4)).toBe(false);
    expect(stoneChannelS()).toBe(10);
  });

  it('checks the near-fatal trigger', () => {
    const check = { hpAfter: 5, maxHp: 100, resonance: 0.7, hiddenSync: 5, rolledToday: false };
    expect(edgeTriggerEligible(check)).toBe(true);
    expect(edgeTriggerEligible({ ...check, hpAfter: 0 })).toBe(false);
    expect(edgeTriggerEligible({ ...check, hpAfter: 5.1 })).toBe(false);
    expect(edgeTriggerEligible({ ...check, resonance: 0.69 })).toBe(false);
    expect(edgeTriggerEligible({ ...check, hiddenSync: 4.9 })).toBe(false);
    expect(edgeTriggerEligible({ ...check, rolledToday: true })).toBe(false);
    expect(rollEdgeTrigger(new SequenceRng([0]))).toBe(true);
    expect(rollEdgeTrigger(new SequenceRng([U32_MAX]))).toBe(false);
  });

  it('completes the circuit with six points inside one game day', () => {
    expect(isCircuitComplete([0, 400, 800, 1200, 1600, 2880])).toBe(true);
    expect(isCircuitComplete([0, 400, 800, 1200, 1600, 2881])).toBe(false);
    expect(isCircuitComplete([5000, 0, 3000, 3100, 3200, 3300, 3400])).toBe(true);
    expect(isCircuitComplete([0, 1, 2])).toBe(false);
  });
});
