/**
 * Collision for movement: the 8 px grid built from a map's collision layer, and axis-separated
 * resolution of the feet box against it. Only `+ − × ÷` and `Math.floor/min/max` are used, so
 * every engine resolves a move to the same bits.
 */
import { NET } from '../net-constants.js';
import { CollisionCell, type CollisionCellKind, type CollisionGrid } from '../types/movement.js';

/** Quadrants of one 16 px tile, as mask bits: top-left, top-right, bottom-left, bottom-right. */
const QUADRANTS: readonly { readonly bit: number; readonly dx: number; readonly dy: number }[] = [
  { bit: 1, dx: 0, dy: 0 },
  { bit: 2, dx: 1, dy: 0 },
  { bit: 4, dx: 0, dy: 1 },
  { bit: 8, dx: 1, dy: 1 },
];

/** A collision tile id is `kind × 16 + mask`. */
const MASK_SPAN = 16;
const CELLS_PER_TILE = 2;

/** Collision tile kinds in id order; their cell value is their position plus one. */
const TILE_KINDS: readonly CollisionCellKind[] = [
  CollisionCell.SOLID,
  CollisionCell.WATER,
  CollisionCell.LOW_WALL,
];

const HALF_FEET_W = NET.FEET_BOX_W_PX / 2;
const CELL = NET.COLLISION_CELL_PX;

function stampTile(cells: Uint8Array, w8: number, tx: number, ty: number, id: number): void {
  const kind = TILE_KINDS[Math.floor(id / MASK_SPAN)];
  const mask = id % MASK_SPAN;
  if (kind === undefined || mask === 0) {
    throw new RangeError(`collision tile id ${id} is not a kind with a quadrant mask`);
  }
  for (const quadrant of QUADRANTS) {
    if ((mask & quadrant.bit) !== 0) {
      const cx = tx * CELLS_PER_TILE + quadrant.dx;
      const cy = ty * CELLS_PER_TILE + quadrant.dy;
      cells[cy * w8 + cx] = kind;
    }
  }
}

/**
 * Builds the 8 px grid from a collision layer of `width` × `height` tiles. `localIds` holds one
 * local tile id per tile, row by row, or null where the layer is empty.
 */
export function collisionGridFromTiles(
  width: number,
  height: number,
  localIds: readonly (number | null)[],
): CollisionGrid {
  if (localIds.length !== width * height) {
    throw new RangeError(`expected ${width * height} collision tiles, got ${localIds.length}`);
  }
  const w8 = width * CELLS_PER_TILE;
  const h8 = height * CELLS_PER_TILE;
  const cells = new Uint8Array(w8 * h8);
  for (let ty = 0; ty < height; ty += 1) {
    for (let tx = 0; tx < width; tx += 1) {
      const id = localIds[ty * width + tx];
      if (id !== null && id !== undefined) {
        stampTile(cells, w8, tx, ty, id);
      }
    }
  }
  return { w8, h8, cells };
}

/** Cell kind at a cell position; everything outside the grid is solid. */
export function cellAt(grid: CollisionGrid, cx: number, cy: number): number {
  if (cx < 0 || cy < 0 || cx >= grid.w8 || cy >= grid.h8) {
    return CollisionCell.SOLID;
  }
  return grid.cells[cy * grid.w8 + cx] ?? CollisionCell.SOLID;
}

/** Solid always blocks movement; water and low walls block everything except flyers. */
export function isMoveBlocked(cell: number, flying: boolean): boolean {
  if (cell === CollisionCell.FREE) return false;
  if (cell === CollisionCell.SOLID) return true;
  return !flying;
}

/** First and last cell index a half-open span [lo, hi) of px overlaps. */
function cellSpan(lo: number, hi: number): readonly [number, number] {
  return [Math.floor(lo / CELL), -Math.floor(-hi / CELL) - 1];
}

function columnBlocked(grid: CollisionGrid, cx: number, rows: readonly [number, number]): boolean {
  for (let cy = rows[0]; cy <= rows[1]; cy += 1) {
    if (isMoveBlocked(cellAt(grid, cx, cy), false)) return true;
  }
  return false;
}

function rowBlocked(grid: CollisionGrid, cy: number, cols: readonly [number, number]): boolean {
  for (let cx = cols[0]; cx <= cols[1]; cx += 1) {
    if (isMoveBlocked(cellAt(grid, cx, cy), false)) return true;
  }
  return false;
}

/**
 * Moves the feet point from `x` to `nx` at height `y`, stopping the feet box flush against the
 * first blocking cell it would enter. Cells the box already overlaps do not stop it.
 */
export function resolveX(grid: CollisionGrid, x: number, y: number, nx: number): number {
  const rows = cellSpan(y - NET.FEET_BOX_H_PX, y);
  if (nx > x) {
    const first = cellSpan(x - HALF_FEET_W, x + HALF_FEET_W)[1] + 1;
    const last = cellSpan(nx - HALF_FEET_W, nx + HALF_FEET_W)[1];
    for (let cx = first; cx <= last; cx += 1) {
      if (columnBlocked(grid, cx, rows)) return cx * CELL - HALF_FEET_W;
    }
  } else if (nx < x) {
    const first = cellSpan(x - HALF_FEET_W, x + HALF_FEET_W)[0] - 1;
    const last = cellSpan(nx - HALF_FEET_W, nx + HALF_FEET_W)[0];
    for (let cx = first; cx >= last; cx -= 1) {
      if (columnBlocked(grid, cx, rows)) return (cx + 1) * CELL + HALF_FEET_W;
    }
  }
  return nx;
}

/** The vertical counterpart of `resolveX`; the box spans from 6 px above the feet to the feet. */
export function resolveY(grid: CollisionGrid, x: number, y: number, ny: number): number {
  const cols = cellSpan(x - HALF_FEET_W, x + HALF_FEET_W);
  const top = NET.FEET_BOX_H_PX;
  if (ny > y) {
    const first = cellSpan(y - top, y)[1] + 1;
    const last = cellSpan(ny - top, ny)[1];
    for (let cy = first; cy <= last; cy += 1) {
      if (rowBlocked(grid, cy, cols)) return cy * CELL;
    }
  } else if (ny < y) {
    const first = cellSpan(y - top, y)[0] - 1;
    const last = cellSpan(ny - top, ny)[0];
    for (let cy = first; cy >= last; cy -= 1) {
      if (rowBlocked(grid, cy, cols)) return (cy + 1) * CELL + top;
    }
  }
  return ny;
}
