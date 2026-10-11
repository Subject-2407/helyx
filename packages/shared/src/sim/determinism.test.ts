import { beforeAll, describe, expect, it } from 'vitest';
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
import { moveParams, moveState, roomGrid } from '../testing/move-fixtures.js';

const SEQUENCES = 10_000;
const FRAMES = 30;
const FIELDS = 11;
const STATE_BYTES = FIELDS * 8;

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

interface Replay {
  /** The state after the last frame of each sequence, one sequence after another. */
  readonly finals: Uint8Array;
  /** The state after every frame, sequence by sequence and frame by frame. */
  readonly frames: Uint8Array;
  /** FNV-1a folded over every frame's state in that order. */
  readonly frameHash: number;
}

function replay(sequences: readonly Sequence[]): Replay {
  const finals = new Uint8Array(sequences.length * STATE_BYTES);
  const frames = new Uint8Array(sequences.length * FRAMES * STATE_BYTES);
  const finalView = new DataView(finals.buffer);
  const frameView = new DataView(frames.buffer);
  let frameOffset = 0;
  sequences.forEach((sequence, index) => {
    let state = sequence.start;
    for (const frame of sequence.frames) {
      state = stepMove(state, frame, sequence.params, GRID);
      serialize(state, frameView, frameOffset);
      frameOffset += STATE_BYTES;
    }
    serialize(state, finalView, index * STATE_BYTES);
  });
  return { finals, frames, frameHash: fnv1aBytes(frames) };
}

interface FrameMismatch {
  readonly sequence: number;
  readonly frame: number;
}

/** Where two per-frame streams first disagree, or null when they match byte for byte. */
function firstMismatch(first: Uint8Array, second: Uint8Array): FrameMismatch | null {
  const length = Math.max(first.length, second.length);
  for (let index = 0; index < length; index += 1) {
    if (first[index] !== second[index]) {
      const step = Math.floor(index / STATE_BYTES);
      return { sequence: Math.floor(step / FRAMES), frame: step % FRAMES };
    }
  }
  return null;
}

describe('movement determinism', () => {
  let first: Replay;
  let second: Replay;

  beforeAll(() => {
    const sequences = makeSequences();
    first = replay(sequences);
    second = replay(sequences);
  });

  it('replays ten thousand input sequences to identical bytes and the recorded hash', () => {
    expect(second.finals.length).toBe(first.finals.length);
    expect(first.finals.findIndex((byte, index) => byte !== second.finals[index])).toBe(-1);
    expect(fnv1aBytes(first.finals)).toBe(golden.fnv1a);
  });

  it('matches on every frame of every sequence and the recorded frame stream hash', () => {
    expect(first.frames.length).toBe(SEQUENCES * FRAMES * STATE_BYTES);
    expect(firstMismatch(first.frames, second.frames)).toBeNull();
    expect(first.frameHash).toBe(golden.frameStreamFnv1a);
    expect(second.frameHash).toBe(golden.frameStreamFnv1a);
  });

  it('names the sequence and frame of the first difference', () => {
    const sequence = 1234;
    const frame = 17;
    const perturbed = first.frames.slice();
    const byte = (sequence * FRAMES + frame) * STATE_BYTES + 3;
    perturbed[byte] = (perturbed[byte] ?? 0) ^ 1;
    expect(firstMismatch(first.frames, perturbed)).toEqual({ sequence, frame });
    expect(firstMismatch(first.frames, first.frames.subarray(0, STATE_BYTES))).toEqual({
      sequence: 0,
      frame: 1,
    });
    expect(fnv1aBytes(perturbed)).not.toBe(first.frameHash);
  });
});
