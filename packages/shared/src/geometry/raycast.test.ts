import { describe, expect, it } from 'vitest';
import type { CollisionGrid } from '../types/movement.js';
import { hasLineOfSight, raycastGrid } from './raycast.js';

const FREE = 0;
const SOLID = 1;
const WATER = 2;
const LOW_WALL = 3;
const CELL = 8;

/** A 10 × 10 cell grid (80 × 80 px) with the listed cells set to a collision kind. */
function grid(marks: readonly (readonly [number, number, number])[] = []): CollisionGrid {
  const w8 = 10;
  const h8 = 10;
  const cells = new Uint8Array(w8 * h8).fill(FREE);
  for (const [cx, cy, kind] of marks) cells[cy * w8 + cx] = kind;
  return { w8, h8, cells };
}

/** Center of a cell in px. */
function center(cx: number, cy: number): { x: number; y: number } {
  return { x: cx * CELL + CELL / 2, y: cy * CELL + CELL / 2 };
}

describe('raycastGrid', () => {
  it('sees across open ground', () => {
    expect(raycastGrid(grid(), center(1, 1), center(8, 7))).toEqual({ clear: true });
  });

  it('sees within a single cell', () => {
    expect(raycastGrid(grid(), { x: 9, y: 9 }, { x: 15, y: 10 })).toEqual({ clear: true });
  });

  it('stops a horizontal ray at the first solid cell', () => {
    const walls = grid([
      [5, 5, SOLID],
      [7, 5, SOLID],
    ]);
    expect(raycastGrid(walls, center(1, 5), center(8, 5))).toEqual({
      clear: false,
      hitCell: { cx: 5, cy: 5 },
    });
    expect(raycastGrid(walls, center(8, 5), center(1, 5))).toEqual({
      clear: false,
      hitCell: { cx: 7, cy: 5 },
    });
  });

  it('stops a vertical ray at the first solid cell', () => {
    const walls = grid([[3, 6, SOLID]]);
    expect(raycastGrid(walls, center(3, 1), center(3, 9))).toEqual({
      clear: false,
      hitCell: { cx: 3, cy: 6 },
    });
    expect(raycastGrid(walls, center(4, 1), center(4, 9)).clear).toBe(true);
  });

  it('stops a diagonal ray at a solid cell on its path', () => {
    const walls = grid([[4, 4, SOLID]]);
    expect(raycastGrid(walls, center(1, 1), center(8, 8))).toEqual({
      clear: false,
      hitCell: { cx: 4, cy: 4 },
    });
  });

  it('stops a shallow ray at the cell where it crosses a wall column', () => {
    const column = grid(Array.from({ length: 10 }, (_, cy) => [4, cy, SOLID] as const));
    expect(raycastGrid(column, { x: 4, y: 4 }, { x: 60, y: 30 })).toEqual({
      clear: false,
      hitCell: { cx: 4, cy: 2 },
    });
  });

  it('passes a ray that only grazes the corner of one solid cell', () => {
    const corner = grid([[5, 4, SOLID]]);
    expect(raycastGrid(corner, center(1, 1), center(8, 8)).clear).toBe(true);
    const other = grid([[4, 5, SOLID]]);
    expect(raycastGrid(other, center(8, 8), center(1, 1)).clear).toBe(true);
  });

  it('stops a ray squeezing between two solid cells that meet at a corner', () => {
    const seam = grid([
      [5, 4, SOLID],
      [4, 5, SOLID],
    ]);
    expect(raycastGrid(seam, center(1, 1), center(8, 8))).toEqual({
      clear: false,
      hitCell: { cx: 5, cy: 4 },
    });
  });

  it('sees over water and low walls', () => {
    const lowGround = grid([
      [3, 5, WATER],
      [4, 5, LOW_WALL],
      [5, 5, WATER],
    ]);
    expect(raycastGrid(lowGround, center(1, 5), center(8, 5))).toEqual({ clear: true });
    expect(hasLineOfSight(lowGround, center(1, 5), center(8, 5))).toBe(true);
  });

  it('treats the cells of both end points as open', () => {
    const counter = grid([
      [5, 1, SOLID],
      [1, 1, SOLID],
    ]);
    expect(raycastGrid(counter, center(2, 1), center(5, 1)).clear).toBe(true);
    expect(raycastGrid(counter, center(1, 1), center(4, 1)).clear).toBe(true);
  });

  it('treats the space outside the map as solid', () => {
    expect(raycastGrid(grid(), center(1, 1), { x: -20, y: 12 })).toEqual({
      clear: false,
      hitCell: { cx: -1, cy: 1 },
    });
    expect(raycastGrid(grid(), center(1, 1), { x: -4, y: 12 })).toEqual({
      clear: false,
      hitCell: { cx: -1, cy: 1 },
    });
    expect(raycastGrid(grid(), { x: 90, y: 12 }, center(8, 1))).toEqual({
      clear: false,
      hitCell: { cx: 11, cy: 1 },
    });
    expect(hasLineOfSight(grid(), center(9, 9), { x: 81, y: 76 })).toBe(false);
  });

  it('rejects a grid whose cell array does not match its size', () => {
    const broken = { w8: 4, h8: 4, cells: new Uint8Array(15) };
    expect(() => raycastGrid(broken, center(0, 0), center(1, 1))).toThrow(RangeError);
  });

  it('rejects non-finite end points', () => {
    expect(() => raycastGrid(grid(), { x: Number.NaN, y: 0 }, center(1, 1))).toThrow(RangeError);
  });
});
