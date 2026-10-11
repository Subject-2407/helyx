// Fixtures shared by the movement tests: a small walled room and default parameters.
import { CollisionCell, type CollisionGrid } from '../types/movement.js';
import type { MoveParams, MoveState } from '../sim/state.js';

/** Builds a grid of `w8` × `h8` free cells with a solid border and the listed solid cells. */
export function roomGrid(
  w8: number,
  h8: number,
  solids: readonly (readonly [number, number])[] = [],
): CollisionGrid {
  const cells = new Uint8Array(w8 * h8);
  for (let cy = 0; cy < h8; cy += 1) {
    for (let cx = 0; cx < w8; cx += 1) {
      if (cx === 0 || cy === 0 || cx === w8 - 1 || cy === h8 - 1) {
        cells[cy * w8 + cx] = CollisionCell.SOLID;
      }
    }
  }
  for (const [cx, cy] of solids) {
    cells[cy * w8 + cx] = CollisionCell.SOLID;
  }
  return { w8, h8, cells };
}

export function moveState(overrides: Partial<MoveState> = {}): MoveState {
  return {
    x: 40,
    y: 40,
    dashMs: 0,
    dashDir: 0,
    dashCdMs: 0,
    knockMs: 0,
    knockVx: 0,
    knockVy: 0,
    stamina: 105,
    staDelayMs: 0,
    facing: 1,
    ...overrides,
  };
}

export function moveParams(overrides: Partial<MoveParams> = {}): MoveParams {
  return {
    speed: 81.2,
    actionMult: 1,
    mflags: 0,
    dashCost: 24.75,
    agi: 5,
    guarding: false,
    maxStamina: 105,
    ...overrides,
  };
}
