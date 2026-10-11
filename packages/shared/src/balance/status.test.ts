import { describe, expect, it } from 'vitest';
import { STATUS_IDS, type Archetype, type StatusId } from '../types/combat.js';
import golden from './__golden__/status.json' with { type: 'json' };
import {
  POISE_HIT_DAMAGE,
  STATUS_TABLE,
  type PublicStatusId,
  type StackingKind,
  type StatusRow,
} from './constants.js';
import hiddenGolden from './listener/__golden__/status.json' with { type: 'json' };
import { LISTENER_STATUS_TABLE, type ListenerStatusId } from './listener/index.js';
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
  type StackingOutcome,
  type StackingRule,
  type StatusApplication,
} from './status.js';

interface GoldenRow<Name extends string> {
  readonly name: Name;
  readonly magnitude: number;
  readonly durationS: number;
  readonly tickS?: number;
  readonly maxDurationS?: number;
  readonly maxStacks?: number;
  readonly stacking: string;
  readonly resisted: number;
}

const ROWS = golden.statuses as readonly GoldenRow<PublicStatusId>[];
const HIDDEN_ROWS = hiddenGolden.statuses as readonly GoldenRow<ListenerStatusId>[];

/** Checks a table row against its golden row, at no resist and at the golden resist. */
function expectRow(defaults: StatusRow, row: GoldenRow<string>, resist: number): void {
  expect(defaults.magnitude).toBeCloseTo(row.magnitude, 4);
  expect(defaults.durationS).toBeCloseTo(row.durationS, 4);
  expect(defaults.stacking).toBe(row.stacking);
  expect(defaults.tickS).toBe(row.tickS);
  expect(defaults.maxDurationS).toBe(row.maxDurationS);
  expect(defaults.maxStacks).toBe(row.maxStacks);
  expect(statusDuration(defaults, 0)).toBeCloseTo(row.durationS, 4);
  expect(statusDuration(defaults, resist)).toBeCloseTo(row.resisted, 4);
}

describe('status defaults', () => {
  it('covers every public status exactly once', () => {
    expect(ROWS.map((row) => row.name).sort()).toEqual(Object.keys(STATUS_TABLE).sort());
  });

  it('covers every status between the public and the separate golden rows', () => {
    const names = [...ROWS, ...HIDDEN_ROWS].map((row) => row.name);
    expect(names.sort()).toEqual([...STATUS_IDS].sort());
  });

  it.each(ROWS)('$name row', (row) => {
    expectRow(STATUS_TABLE[row.name], row, golden.resist);
  });

  it.each(HIDDEN_ROWS)('$name row from the separate table', (row) => {
    expectRow(LISTENER_STATUS_TABLE[row.name], row, hiddenGolden.resist);
  });

  it('holds requested durations to the cap', () => {
    expect(statusDuration(STATUS_TABLE.stun, 0, 3)).toBeCloseTo(1.5, 4);
    expect(statusDuration(STATUS_TABLE.exposed, 0, 4)).toBeCloseTo(4, 4);
    expect(statusDuration(STATUS_TABLE.exposed, 0, 6)).toBeCloseTo(4, 4);
    expect(statusDuration(STATUS_TABLE.root, 0.5, 1)).toBeCloseTo(0.5, 4);
  });

  it('rejects invalid resist and durations', () => {
    expect(() => statusDuration(STATUS_TABLE.burn, 1)).toThrow(RangeError);
    expect(() => statusDuration(STATUS_TABLE.burn, -0.1)).toThrow(RangeError);
    expect(() => statusDuration(STATUS_TABLE.burn, 0, -1)).toThrow(RangeError);
  });

  it('pushes knockback over its fixed time', () => {
    expect(KNOCKBACK_PUSH_S).toBe(golden.knockbackPushS);
  });
});

function running(name: StatusId, magnitude: number, untilS: number, stacks = 1): ActiveStatus {
  return { name, magnitude, untilS, stacks };
}

/** Applies a public status with its default row from the public table. */
function applyPublic(
  current: ActiveStatus | undefined,
  incoming: StatusApplication & { readonly name: PublicStatusId },
  rules?: ReadonlyMap<StackingKind, StackingRule>,
): StackingOutcome {
  return applyStatus(current, incoming, STATUS_TABLE[incoming.name], rules);
}

describe('status stacking', () => {
  it('registers a rule for every stacking kind in use', () => {
    for (const row of [...Object.values(STATUS_TABLE), ...Object.values(LISTENER_STATUS_TABLE)]) {
      expect(DEFAULT_STACKING_RULES.has(row.stacking)).toBe(true);
    }
  });

  it('refreshes the timer and takes the new magnitude', () => {
    const result = applyPublic(running('burn', 0.25, 2), {
      name: 'burn',
      magnitude: 0.3,
      durationS: 3,
      nowS: 1,
    });
    expect(result).toEqual({ status: running('burn', 0.3, 4), applied: true });
  });

  it('stacks up to the limit and refreshes the timer', () => {
    const apply = (current: ActiveStatus | undefined, nowS: number): ActiveStatus | undefined =>
      applyPublic(current, { name: 'bleed', magnitude: 0.08, durationS: 4, nowS }).status;
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
    const weaker = applyPublic(strong, { name: 'slow', magnitude: -0.3, durationS: 2, nowS: 1 });
    expect(weaker).toEqual({ status: strong, applied: false });
    const equal = applyPublic(strong, { name: 'slow', magnitude: -0.5, durationS: 2, nowS: 4 });
    expect(equal).toEqual({ status: running('slow', -0.5, 6), applied: true });
  });

  it('does not refresh a stun while it lasts, but does after it ends', () => {
    const stun = running('stun', 0, 1.5);
    const during = applyPublic(stun, { name: 'stun', magnitude: 0, durationS: 1.5, nowS: 1 });
    expect(during).toEqual({ status: stun, applied: false });
    const after = applyPublic(stun, { name: 'stun', magnitude: 0, durationS: 1, nowS: 1.5 });
    expect(after).toEqual({ status: running('stun', 0, 2.5), applied: true });
  });

  it('leaves nothing running for instant effects', () => {
    const result = applyPublic(undefined, {
      name: 'dispelled',
      magnitude: 0,
      durationS: 0,
      nowS: 0,
    });
    expect(result).toEqual({ status: undefined, applied: true });
  });

  it('stacks a status from the separate table by the row it is given', () => {
    const row = LISTENER_STATUS_TABLE.jarred;
    const app = { name: 'jarred', magnitude: row.magnitude, durationS: row.durationS } as const;
    const first = applyStatus(undefined, { ...app, nowS: 0 }, row);
    const again = applyStatus(first.status, { ...app, nowS: 1 }, row);
    expect(again).toEqual({ status: running('jarred', row.magnitude, 5), applied: true });
  });

  it('treats an expired status as absent', () => {
    const old = running('bleed', 0.08, 2, 3);
    const result = applyPublic(old, { name: 'bleed', magnitude: 0.08, durationS: 4, nowS: 2 });
    expect(result.status?.stacks).toBe(1);
  });

  it('refuses mismatched statuses and unknown stacking kinds', () => {
    const app = { name: 'burn', magnitude: 0.25, durationS: 3, nowS: 0 } as const;
    expect(() => applyPublic(running('bleed', 0.08, 5), app)).toThrow(Error);
    expect(() => applyPublic(undefined, app, new Map())).toThrow(Error);
  });
});

describe('damage over time', () => {
  it('splits burn damage into half-second ticks', () => {
    const { hit, tickDamage, ticks, resistedTicks } = golden.burn;
    expect(burnTickDamage(hit)).toBeCloseTo(tickDamage, 4);
    expect(dotTickCount(statusDuration(STATUS_TABLE.burn, 0), STATUS_TABLE.burn.tickS ?? 0)).toBe(
      ticks,
    );
    const shortened = statusDuration(STATUS_TABLE.burn, golden.resist);
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
