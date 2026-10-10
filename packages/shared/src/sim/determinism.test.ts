import { describe, expect, it } from 'vitest';
import { dashCostParam } from '../balance/movement.js';
import { fnv1aBytes } from '../rng/hash.js';
import { chance, pickUniform, randFloat, randInt } from '../rng/random.js';
import type { Rng } from '../rng/rng.js';
import { createSfc32 } from '../rng/sfc32.js';
import { SEED_A } from '../testing/seeds.js';
import type { EncumbranceTier } from '../types/combat.js';
import { MoveFlag, type Dir8 } from '../types/movement.js';
import golden from './__golden__/determinism.json' with { type: 'json' };
import { quantizePos } from './fixed.js';
import { stepMove } from './movement.js';
import type { FrameInput, MoveParams, MoveState } from './state.js';
import { moveParams, moveState, roomGrid } from './test-fixtures.js';

const SEQUENCES = 10_000;
const FRAMES = 30;
const FIELDS = 11;

/** A walled room with a few pillars and a wall with a gap, so collisions happen often. */
const GRID = roomGrid(24, 18, [
  [6, 4],
  [6, 5],
  [7, 4],
  [7, 5],
  [14, 9],
  [15, 9],
  [16, 9],
  [10, 1],
  [10, 2],
  [10, 3],
  [10, 6],
  [10, 7],
  [10, 8],
  [10, 9],
  [10, 10],
]);

const FLAG_CHOICES = [0, 0, 0, MoveFlag.ROOTED, MoveFlag.NO_DASH, MoveFlag.STUNNED];
const ACTION_MULTS = [1, 1, 0.5, 0.7];
const TIERS: readonly EncumbranceTier[] = [0, 0, 0, 1, 2];

interface Sequence {
  readonly start: MoveState;
  readonly params: MoveParams;
  readonly frames: readonly FrameInput[];
}

function randomStart(rng: Rng): MoveState {
  const knock = chance(rng, 0.1);
  return moveState({
    x: quantizePos(randFloat(rng, 12, 180)),
    y: quantizePos(randFloat(rng, 14, 136)),
    stamina: randInt(rng, 0, 105),
    staDelayMs: chance(rng, 0.3) ? randFloat(rng, 0, 600) : 0,
    facing: chance(rng, 0.5) ? 1 : -1,
    ...(knock
      ? { knockMs: 150, knockVx: randFloat(rng, -300, 300), knockVy: randFloat(rng, -300, 300) }
      : {}),
  });
}

function randomParams(rng: Rng): MoveParams {
  const agi = randInt(rng, 0, 100);
  return moveParams({
    speed: randFloat(rng, 40, 112),
    actionMult: pickUniform(rng, ACTION_MULTS),
    mflags: pickUniform(rng, FLAG_CHOICES),
    dashCost: dashCostParam(agi, pickUniform(rng, TIERS)),
    agi,
    guarding: chance(rng, 0.15),
    maxStamina: 100 + agi,
  });
}

function makeSequences(): Sequence[] {
  const rng = createSfc32(SEED_A);
  return Array.from({ length: SEQUENCES }, () => ({
    start: randomStart(rng),
    params: randomParams(rng),
    frames: Array.from({ length: FRAMES }, () => ({
      move: randInt(rng, 0, 8) as Dir8,
      dashPressed: chance(rng, 0.1),
    })),
  }));
}

function serialize(state: MoveState, view: DataView, offset: number): void {
  const values = [
    state.x,
    state.y,
    state.dashMs,
    state.dashDir,
    state.dashCdMs,
    state.knockMs,
    state.knockVx,
    state.knockVy,
    state.stamina,
    state.staDelayMs,
    state.facing,
  ];
  values.forEach((value, index) => view.setFloat64(offset + index * 8, value, true));
}

function replay(sequences: readonly Sequence[]): Uint8Array {
  const bytes = new Uint8Array(sequences.length * FIELDS * 8);
  const view = new DataView(bytes.buffer);
  sequences.forEach((sequence, index) => {
    let state = sequence.start;
    for (const frame of sequence.frames) {
      state = stepMove(state, frame, sequence.params, GRID);
    }
    serialize(state, view, index * FIELDS * 8);
  });
  return bytes;
}

describe('movement determinism', () => {
  it('replays ten thousand input sequences to identical bytes and the recorded hash', () => {
    const sequences = makeSequences();
    const first = replay(sequences);
    const second = replay(sequences);
    expect(second.length).toBe(first.length);
    expect(first.findIndex((byte, index) => byte !== second[index])).toBe(-1);
    expect(fnv1aBytes(first)).toBe(golden.fnv1a);
  });
});
