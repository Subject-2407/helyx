import { NET } from '../net-constants.js';
import { CollisionCell, type CollisionGrid } from '../types/movement.js';
import type { GeoPoint } from './shapes/box.js';

export interface GridCell {
  cx: number;
  cy: number;
}

export type RaycastResult = { clear: true } | { clear: false; hitCell: GridCell };

const CLEAR: RaycastResult = Object.freeze({ clear: true });

function inBounds(grid: CollisionGrid, cx: number, cy: number): boolean {
  return cx >= 0 && cy >= 0 && cx < grid.w8 && cy < grid.h8;
}

/** Only solid cells block sight; water and low walls can be seen and shot across. */
function blocksSight(grid: CollisionGrid, cx: number, cy: number): boolean {
  return !inBounds(grid, cx, cy) || grid.cells[cy * grid.w8 + cx] === CollisionCell.SOLID;
}

function validate(grid: CollisionGrid, from: GeoPoint, to: GeoPoint): void {
  if (grid.cells.length !== grid.w8 * grid.h8) {
    throw new RangeError(`Collision grid has ${grid.cells.length} cells, expected w8 × h8`);
  }
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) {
    throw new RangeError('Line of sight end points must be finite');
  }
}

function cellOf(p: GeoPoint): GridCell {
  return {
    cx: Math.floor(p.x / NET.COLLISION_CELL_PX),
    cy: Math.floor(p.y / NET.COLLISION_CELL_PX),
  };
}

/** Distance in px from `start` to the next cell boundary when moving in direction `step`. */
function gapToBoundary(cell: number, step: number, start: number): number {
  const boundary = (step > 0 ? cell + 1 : cell) * NET.COLLISION_CELL_PX;
  return Math.abs(boundary - start);
}

/** The ray as the walk sees it: where it starts, how far it goes and which way it steps. */
interface Ray {
  from: GeoPoint;
  absDx: number;
  absDy: number;
  sx: number;
  sy: number;
}

/** Which boundary the ray crosses next from cell (cx, cy): a column, a row, or both at a corner. */
function nextCrossing(ray: Ray, cx: number, cy: number): 'x' | 'y' | 'corner' {
  if (ray.sy === 0) return 'x';
  if (ray.sx === 0) return 'y';
  // Compares gapX / |dx| with gapY / |dy| without dividing, so ties are exact.
  const crossX = gapToBoundary(cx, ray.sx, ray.from.x) * ray.absDy;
  const crossY = gapToBoundary(cy, ray.sy, ray.from.y) * ray.absDx;
  if (crossX < crossY) return 'x';
  if (crossY < crossX) return 'y';
  return 'corner';
}

function sameCell(a: GridCell, b: GridCell): boolean {
  return a.cx === b.cx && a.cy === b.cy;
}

/**
 * Walks every cell the segment passes through, in order (a grid DDA), and reports the first
 * solid one.
 *
 * Rules:
 * - Out-of-bounds cells are solid, including an end point that lies off the map.
 * - The cells holding the two end points never block, so something standing on a solid cell
 *   (a counter, a station) can still be seen, and sight is symmetric.
 * - A segment that passes exactly through a cell corner touches the two side cells only at
 *   that point. Grazing one solid corner does not block; passing between two solid cells that
 *   meet at that corner does, so diagonal wall seams cannot be seen through.
 *
 * Boundary crossings are compared by cross-multiplication instead of accumulated ratios, so
 * corner hits are detected exactly for positions on the 1/64 px grid.
 */
export function raycastGrid(grid: CollisionGrid, from: GeoPoint, to: GeoPoint): RaycastResult {
  validate(grid, from, to);
  const start = cellOf(from);
  const end = cellOf(to);
  if (!inBounds(grid, start.cx, start.cy)) return { clear: false, hitCell: start };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const ray: Ray = {
    from,
    absDx: Math.abs(dx),
    absDy: Math.abs(dy),
    sx: Math.sign(dx),
    sy: Math.sign(dy),
  };
  const cell = { ...start };
  // Every step moves one cell closer to the end on at least one axis, which bounds the walk.
  let stepsLeft = Math.abs(end.cx - start.cx) + Math.abs(end.cy - start.cy);
  while (!sameCell(cell, end) && stepsLeft-- > 0) {
    const crossing = nextCrossing(ray, cell.cx, cell.cy);
    if (crossing === 'corner') {
      const side = { cx: cell.cx + ray.sx, cy: cell.cy };
      if (blocksSight(grid, side.cx, side.cy) && blocksSight(grid, cell.cx, cell.cy + ray.sy)) {
        return { clear: false, hitCell: side };
      }
    }
    if (crossing !== 'y') cell.cx += ray.sx;
    if (crossing !== 'x') cell.cy += ray.sy;
    if (!sameCell(cell, end) && blocksSight(grid, cell.cx, cell.cy)) {
      return { clear: false, hitCell: { ...cell } };
    }
  }
  return inBounds(grid, end.cx, end.cy) ? CLEAR : { clear: false, hitCell: end };
}

/** Whether `to` can be seen from `from` on the collision grid. */
export function hasLineOfSight(grid: CollisionGrid, from: GeoPoint, to: GeoPoint): boolean {
  return raycastGrid(grid, from, to).clear;
}
