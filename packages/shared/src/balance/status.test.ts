import { describe, expect, it } from 'vitest';
import { STATUS_IDS, type Archetype, type StatusId } from '../types/combat.js';
import golden from './__golden__/status.json' with { type: 'json' };
import { POISE_HIT_DAMAGE, STATUS_TABLE } from './constants.js';
import {
  applyPoiseDamage,
  applyStatus,
  archetypePoise,
  bleedTickDamage,
  burnTickDamage,
  CC_DR_STATUSES,
  ccDiminish,
  DEFAULT_STACKING_RULES,
  diminishesInPvp,
  dotTickCount,
  KNOCKBACK_PUSH_S,
  playerPoise,
  poiseRegenDelayS,
  regenPoise,
  statusDuration,
  type ActiveStatus,
  type CcDrState,
} from './status.js';

interface StatusRow {
  readonly name: StatusId;
  readonly magnitude: number;
  readonly durationS: number;
  readonly tickS?: number;
  readonly maxDurationS?: number;
  readonly maxStacks?: number;
  readonly stacking: string;
  readonly resisted: number;
}

const ROWS = golden.statuses as readonly StatusRow[];

describe('status defaults', () => {
  it('covers every status exactly once', () => {
    expect(ROWS.map((row) => row.name).sort()).toEqual([...STATUS_IDS].sort());
  });

  it.each(ROWS)('$name row', (row) => {
    const defaults = STATUS_TABLE[row.name];
    expect(defaults.magnitude).toBeCloseTo(row.magnitude, 4);
    expect(defaults.durationS).toBeCloseTo(row.durationS, 4);
    expect(defaults.stacking).toBe(row.stacking);
    expect(defaults.tickS).toBe(row.tickS);
    expect(defaults.maxDurationS).toBe(row.maxDurationS);
    expect(defaults.maxStacks).toBe(row.maxStacks);
    expect(statusDuration(row.name, 0)).toBeCloseTo(row.durationS, 4);
    expect(statusDuration(row.name, golden.resist)).toBeCloseTo(row.resisted, 4);
  });

  it('holds requested durations to the cap', () => {
    expect(statusDuration('stun', 0, 3)).toBeCloseTo(1.5, 4);
    expect(statusDuration('exposed', 0, 4)).toBeCloseTo(4, 4);
    expect(statusDuration('exposed', 0, 6)).toBeCloseTo(4, 4);
    expect(statusDuration('root', 0.5, 1)).toBeCloseTo(0.5, 4);
  });

  it('rejects invalid resist and durations', () => {
    expect(() => statusDuration('burn', 1)).toThrow(RangeError);
    expect(() => statusDuration('burn', -0.1)).toThrow(RangeError);
    expect(() => statusDuration('burn', 0, -1)).toThrow(RangeError);
  });

  it('pushes knockback over its fixed time', () => {
    expect(KNOCKBACK_PUSH_S).toBe(golden.knockbackPushS);
  });
});

function running(name: StatusId, magnitude: number, untilS: number, stacks = 1): ActiveStatus {
  return { name, magnitude, untilS, stacks };
}

describe('status stacking', () => {
  it('registers a rule for every stacking kind in use', () => {
    for (const name of STATUS_IDS) {
      expect(DEFAULT_STACKING_RULES.has(STATUS_TABLE[name].stacking)).toBe(true);
    }
  });

  it('refreshes the timer and takes the new magnitude', () => {
    const result = applyStatus(running('burn', 0.25, 2), {
      name: 'burn',
      magnitude: 0.3,
      durationS: 3,
      nowS: 1,
    });
    expect(result).toEqual({ status: running('burn', 0.3, 4), applied: true });
  });

  it('stacks up to the limit and refreshes the timer', () => {
    const apply = (current: ActiveStatus | undefined, nowS: number): ActiveStatus | undefined =>
      applyStatus(current, { name: 'bleed', magnitude: 0.08, durationS: 4, nowS }).status;
    const once = apply(undefined, 0);
    const twice = apply(once, 1);
    const thrice = apply(twice, 2);
    const four = apply(thrice, 3);
    expect(once?.stacks).toBe(1);
    expect(twice?.stacks).toBe(2);
    expect(thrice?.stacks).toBe(3);
    expect(four?.stacks).toBe(3);
    expect(four?.untilS).toBe(7);
  });

  it('keeps the stronger slow and lets an equal or stronger one replace it', () => {
    const strong = running('slow', -0.5, 5);
    const weaker = applyStatus(strong, { name: 'slow', magnitude: -0.3, durationS: 2, nowS: 1 });
    expect(weaker).toEqual({ status: strong, applied: false });
    const equal = applyStatus(strong, { name: 'slow', magnitude: -0.5, durationS: 2, nowS: 4 });
    expect(equal).toEqual({ status: running('slow', -0.5, 6), applied: true });
  });

  it('does not refresh a stun while it lasts, but does after it ends', () => {
    const stun = running('stun', 0, 1.5);
    const during = applyStatus(stun, { name: 'stun', magnitude: 0, durationS: 1.5, nowS: 1 });
    expect(during).toEqual({ status: stun, applied: false });
    const after = applyStatus(stun, { name: 'stun', magnitude: 0, durationS: 1, nowS: 1.5 });
    expect(after).toEqual({ status: running('stun', 0, 2.5), applied: true });
  });

  it('leaves nothing running for instant effects', () => {
    const result = applyStatus(undefined, {
      name: 'dispelled',
      magnitude: 0,
      durationS: 0,
      nowS: 0,
    });
    expect(result).toEqual({ status: undefined, applied: true });
  });

  it('treats an expired status as absent', () => {
    const old = running('bleed', 0.08, 2, 3);
    const result = applyStatus(old, { name: 'bleed', magnitude: 0.08, durationS: 4, nowS: 2 });
    expect(result.status?.stacks).toBe(1);
  });

  it('refuses mismatched statuses and unknown stacking kinds', () => {
    const app = { name: 'burn', magnitude: 0.25, durationS: 3, nowS: 0 } as const;
    expect(() => applyStatus(running('bleed', 0.08, 5), app)).toThrow(Error);
    expect(() => applyStatus(undefined, app, new Map())).toThrow(Error);
  });
});

describe('damage over time', () => {
  it('splits burn damage into half-second ticks', () => {
    const { hit, tickDamage, ticks, resistedTicks } = golden.burn;
    expect(burnTickDamage(hit)).toBeCloseTo(tickDamage, 4);
    expect(dotTickCount(statusDuration('burn', 0), STATUS_TABLE.burn.tickS ?? 0)).toBe(ticks);
    const shortened = statusDuration('burn', golden.resist);
    expect(dotTickCount(shortened, STATUS_TABLE.burn.tickS ?? 0)).toBe(resistedTicks);
  });

  it('makes bleed hurt more per stack and while moving', () => {
    const { hit, still, moving, threeStacksMoving } = golden.bleed;
    expect(bleedTickDamage(hit, 1, false)).toBeCloseTo(still, 4);
    expect(bleedTickDamage(hit, 1, true)).toBeCloseTo(moving, 4);
    expect(bleedTickDamage(hit, 3, true)).toBeCloseTo(threeStacksMoving, 4);
  });

  it('rejects invalid inputs', () => {
    expect(() => bleedTickDamage(100, 4, false)).toThrow(RangeError);
    expect(() => burnTickDamage(-1)).toThrow(RangeError);
    expect(() => dotTickCount(3, 0)).toThrow(RangeError);
  });
});

function runChain(steps: readonly { atS: number }[]): number[] {
  let state: CcDrState | undefined;
  return steps.map(({ atS }) => {
    const result = ccDiminish(state, atS);
    state = result.next;
    return result.mult;
  });
}

describe('crowd control diminishing returns between players', () => {
  it('halves, quarters, then grants immunity that ends', () => {
    const chain = golden.diminishing.chain;
    expect(runChain(chain)).toEqual(chain.map((step) => step.mult));
  });

  it('starts over once the window has passed', () => {
    const steps = golden.diminishing.expiring;
    expect(runChain(steps)).toEqual(steps.map((step) => step.mult));
  });

  it('applies only to stun, root and slow', () => {
    expect([...CC_DR_STATUSES].sort()).toEqual([...golden.diminishing.statuses].sort());
    expect(diminishesInPvp('stun')).toBe(true);
    expect(diminishesInPvp('burn')).toBe(false);
  });
});

describe('poise', () => {
  it.each(golden.poise.player)('player with $name', ({ bodyArmor, poise }) => {
    expect(playerPoise(bodyArmor)).toBe(poise);
  });

  it('rejects body armor poise outside its range', () => {
    expect(() => playerPoise(41)).toThrow(RangeError);
    expect(() => playerPoise(-1)).toThrow(RangeError);
  });

  it.each(golden.poise.archetypes)('$name archetype', ({ name, poise, regenS }) => {
    expect(archetypePoise(name as Archetype)).toBe(poise);
    expect(poiseRegenDelayS(regenS > 2)).toBe(regenS);
  });

  it('uses the default poise damage per weapon kind', () => {
    expect(POISE_HIT_DAMAGE).toEqual(golden.poise.hits);
  });

  it('breaks when poise runs out and refills at once', () => {
    const start = { current: 30, max: 30 };
    const first = applyPoiseDamage(start, 25, 0);
    expect(first).toEqual({ state: { current: 5, max: 30, lastDamageS: 0 }, broken: false });
    const second = applyPoiseDamage(first.state, 10, 0.5);
    expect(second).toEqual({ state: { current: 30, max: 30, lastDamageS: 0.5 }, broken: true });
    expect(() => applyPoiseDamage(start, -1, 0)).toThrow(RangeError);
  });

  it('regenerates fully after the delay, later for bosses', () => {
    const worn = { current: 5, max: 30, lastDamageS: 10 };
    expect(regenPoise(worn, 11.99, false)).toBe(worn);
    expect(regenPoise(worn, 12, false).current).toBe(30);
    expect(regenPoise(worn, 13.99, true)).toBe(worn);
    expect(regenPoise(worn, 14, true).current).toBe(30);
    const untouched = { current: 30, max: 30 };
    expect(regenPoise(untouched, 100, false)).toBe(untouched);
  });
});
