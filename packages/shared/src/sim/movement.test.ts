import { describe, expect, it } from 'vitest';
import { MoveFlag, type Dir8 } from '../types/movement.js';
import golden from './__golden__/scripts.json' with { type: 'json' };
import { stepMove } from './movement.js';
import type { FrameInput, MoveParams, MoveState } from './state.js';
import { moveParams, moveState, roomGrid } from './test-fixtures.js';

const GRID = roomGrid(20, 16);
const DIAG_STEP = Math.round(((0.7071067811865476 * 81.2) / 60) * 64) / 64;
const STRAIGHT_STEP = Math.round((81.2 / 60) * 64) / 64;

interface ScriptFrames {
  readonly move: number;
  readonly dash: boolean;
  readonly count: number;
}

function run(
  start: MoveState,
  frames: readonly ScriptFrames[],
  params: MoveParams,
  grid = GRID,
): MoveState {
  let state = start;
  for (const frame of frames) {
    const input: FrameInput = { move: frame.move as Dir8, dashPressed: frame.dash };
    for (let index = 0; index < frame.count; index += 1) {
      state = stepMove(state, input, params, grid);
    }
  }
  return state;
}

function walk(move: Dir8, count: number, params = moveParams(), start = moveState()): MoveState {
  return run(start, [{ move, dash: false, count }], params);
}

describe('golden movement scripts', () => {
  it.each(golden.scripts)('$name', (script) => {
    const grid = roomGrid(
      script.grid.w8,
      script.grid.h8,
      script.grid.solids as readonly (readonly [number, number])[],
    );
    const { dashCost, ...rest } = script.params as { dashCost?: number | null; speed?: number };
    const params = moveParams({
      ...rest,
      ...(dashCost === null ? { dashCost: Number.POSITIVE_INFINITY } : {}),
    });
    const end = run(moveState(script.start), script.frames, params, grid);
    expect({
      x: end.x,
      y: end.y,
      stamina: end.stamina,
      dashMs: end.dashMs,
      facing: end.facing,
    }).toEqual(script.expected);
  });
});

describe('movement step', () => {
  it('moves by speed times the frame time, on the 1/64 px grid', () => {
    const end = walk(1, 1);
    expect(end.x).toBe(40 + STRAIGHT_STEP);
    expect(end.y).toBe(40);
    expect((end.x * 64) % 1).toBe(0);
  });

  it('scales diagonal movement by the diagonal literal', () => {
    const end = walk(8, 1);
    expect(end.x).toBe(40 + DIAG_STEP);
    expect(end.y).toBe(40 + DIAG_STEP);
  });

  it('applies the action multiplier', () => {
    const half = Math.round(((81.2 * 0.5) / 60) * 64) / 64;
    expect(walk(1, 1, moveParams({ actionMult: 0.5 })).x).toBe(40 + half);
  });

  it('keeps every position a multiple of 1/64 px', () => {
    let state = moveState({ x: 41.3, y: 39.9 });
    for (let index = 0; index < 50; index += 1) {
      state = stepMove(
        state,
        { move: ((index % 8) + 1) as Dir8, dashPressed: false },
        moveParams(),
        GRID,
      );
      expect(Number.isInteger(state.x * 64)).toBe(true);
      expect(Number.isInteger(state.y * 64)).toBe(true);
    }
  });

  it('never changes its input objects', () => {
    const start = moveState();
    const copy = { ...start };
    stepMove(start, { move: 1, dashPressed: true }, moveParams(), GRID);
    expect(start).toEqual(copy);
  });

  it('turns to face the horizontal direction of travel', () => {
    expect(walk(5, 1).facing).toBe(-1);
    expect(walk(3, 1, moveParams(), moveState({ facing: -1 })).facing).toBe(-1);
  });

  it.each([
    ['transit', MoveFlag.TRANSIT],
    ['dead', MoveFlag.DEAD],
    ['stunned', MoveFlag.STUNNED],
    ['immobile', MoveFlag.IMMOBILE],
    ['downed', MoveFlag.DOWNED | MoveFlag.IMMOBILE],
    ['rooted', MoveFlag.ROOTED],
  ])('stops walking while %s', (_name, flag) => {
    const end = walk(1, 10, moveParams({ mflags: flag }));
    expect(end.x).toBe(40);
  });

  it('lets a rooted character neither walk nor dash, while no-dash only blocks the dash', () => {
    const rooted = run(
      moveState(),
      [{ move: 1, dash: true, count: 1 }],
      moveParams({ mflags: MoveFlag.ROOTED }),
    );
    expect(rooted.dashMs).toBe(0);
    const noDash = run(
      moveState(),
      [{ move: 1, dash: true, count: 1 }],
      moveParams({ mflags: MoveFlag.NO_DASH }),
    );
    expect(noDash.dashMs).toBe(0);
    expect(noDash.x).toBe(40 + STRAIGHT_STEP);
  });

  it('lets knockback replace input and move even an immobile character', () => {
    const start = moveState({ knockMs: 150, knockVx: -120, knockVy: 0 });
    const end = run(
      start,
      [{ move: 1, dash: false, count: 12 }],
      moveParams({ mflags: MoveFlag.STUNNED }),
    );
    expect(end.x).toBeCloseTo(40 - 18, 1);
    expect(end.knockMs).toBe(0);
  });
});

describe('dash', () => {
  it('spends stamina, pauses regeneration and starts the cooldown', () => {
    const end = run(moveState(), [{ move: 1, dash: true, count: 1 }], moveParams());
    expect(end.stamina).toBe(80.3);
    expect(end.dashMs).toBeGreaterThan(0);
    expect(end.dashCdMs).toBeGreaterThan(end.dashMs);
    expect(end.staDelayMs).toBeGreaterThan(500);
  });

  it('covers its distance and goes the facing way without input', () => {
    const end = run(
      moveState({ x: 100, facing: -1 }),
      [{ move: 0, dash: true, count: 12 }],
      moveParams(),
    );
    expect(100 - end.x).toBeCloseTo(56, 1);
  });

  it('needs enough stamina and no running cooldown', () => {
    const tired = run(
      moveState({ stamina: 20 }),
      [{ move: 1, dash: true, count: 1 }],
      moveParams(),
    );
    expect(tired.dashMs).toBe(0);
    const cooling = run(
      moveState({ dashCdMs: 100 }),
      [{ move: 1, dash: true, count: 1 }],
      moveParams(),
    );
    expect(cooling.dashMs).toBe(0);
  });
});

describe('stamina', () => {
  it('regenerates only after the delay and never past the maximum', () => {
    const delayed = walk(0, 1, moveParams(), moveState({ stamina: 50, staDelayMs: 600 }));
    expect(delayed.stamina).toBe(50);
    const free = walk(0, 60, moveParams(), moveState({ stamina: 50 }));
    // Each frame's gain is kept to one decimal, so 31 per second lands as 0.5 per frame.
    expect(free.stamina).toBe(80);
    const full = walk(0, 600, moveParams(), moveState({ stamina: 50 }));
    expect(full.stamina).toBe(105);
  });

  it('does not regenerate while guarding', () => {
    const end = walk(0, 60, moveParams({ guarding: true }), moveState({ stamina: 50 }));
    expect(end.stamina).toBe(50);
  });

  it('keeps stamina to one decimal', () => {
    const end = walk(0, 7, moveParams(), moveState({ stamina: 50 }));
    expect(Number.isInteger(Math.round(end.stamina * 10 * 1e6) / 1e6)).toBe(true);
  });
});
