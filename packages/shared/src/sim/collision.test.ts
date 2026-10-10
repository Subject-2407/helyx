import { describe, expect, it } from 'vitest';
import { CollisionCell } from '../types/movement.js';
import { cellAt, collisionGridFromTiles, isMoveBlocked, resolveX, resolveY } from './collision.js';
import { roomGrid } from './test-fixtures.js';

describe('collision grid from tiles', () => {
  it('stamps each quadrant of a tile from its mask bits', () => {
    // solid top-left (1), water bottom-right (16 + 8), low wall full tile (32 + 15), empty.
    const grid = collisionGridFromTiles(2, 2, [1, 24, 47, null]);
    expect(grid.w8).toBe(4);
    expect(grid.h8).toBe(4);
    expect(Array.from(grid.cells)).toEqual([1, 0, 0, 0, 0, 0, 0, 2, 3, 3, 0, 0, 3, 3, 0, 0]);
  });

  it('marks the top-right and bottom-left quadrants from their bits', () => {
    const grid = collisionGridFromTiles(1, 1, [2 + 4]);
    expect(Array.from(grid.cells)).toEqual([0, 1, 1, 0]);
  });

  it('rejects unknown ids and size mismatches', () => {
    expect(() => collisionGridFromTiles(1, 1, [48])).toThrow(RangeError);
    expect(() => collisionGridFromTiles(1, 1, [16])).toThrow(RangeError);
    expect(() => collisionGridFromTiles(2, 1, [1])).toThrow(RangeError);
  });
});

describe('collision cells', () => {
  it('treats everything outside the grid as solid', () => {
    const grid = roomGrid(4, 4);
    expect(cellAt(grid, -1, 0)).toBe(CollisionCell.SOLID);
    expect(cellAt(grid, 0, 4)).toBe(CollisionCell.SOLID);
    expect(cellAt(grid, 1, 1)).toBe(CollisionCell.FREE);
  });

  it('blocks walkers on every kind and flyers only on solid', () => {
    expect(isMoveBlocked(CollisionCell.FREE, false)).toBe(false);
    expect(isMoveBlocked(CollisionCell.SOLID, true)).toBe(true);
    expect(isMoveBlocked(CollisionCell.WATER, false)).toBe(true);
    expect(isMoveBlocked(CollisionCell.WATER, true)).toBe(false);
    expect(isMoveBlocked(CollisionCell.LOW_WALL, false)).toBe(true);
    expect(isMoveBlocked(CollisionCell.LOW_WALL, true)).toBe(false);
  });
});

describe('feet box resolution', () => {
  const grid = roomGrid(12, 12);

  it('stops flush against a wall on either side', () => {
    expect(resolveX(grid, 40, 40, 100)).toBe(83);
    expect(resolveX(grid, 40, 40, -20)).toBe(13);
    expect(resolveY(grid, 40, 40, 100)).toBe(88);
    expect(resolveY(grid, 40, 40, -20)).toBe(14);
  });

  it('passes free space unchanged', () => {
    expect(resolveX(grid, 40, 40, 41.5)).toBe(41.5);
    expect(resolveY(grid, 40, 40, 40)).toBe(40);
  });

  it('stays put when already flush', () => {
    expect(resolveX(grid, 83, 40, 83.5)).toBe(83);
    expect(resolveY(grid, 40, 88, 88.5)).toBe(88);
  });
});
