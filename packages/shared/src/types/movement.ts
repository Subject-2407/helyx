/** Movement direction: 0 none, 1 E, 2 NE, 3 N, 4 NW, 5 W, 6 SW, 7 S, 8 SE. */
export type Dir8 = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Every `Dir8` value in ascending order. */
export const DIR8_VALUES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8] as const);

/** Bits of the movement flag field the server sends with every acknowledgement. */
export const MoveFlag = Object.freeze({
  ROOTED: 1,
  STUNNED: 2,
  NO_DASH: 4,
  IMMOBILE: 8,
  TRANSIT: 16,
  DEAD: 32,
  /** Always sent together with IMMOBILE, so prediction does not move a downed character. */
  DOWNED: 64,
} as const);

export type MoveFlagBit = (typeof MoveFlag)[keyof typeof MoveFlag];

/** What one 8 px collision cell holds. */
export const CollisionCell = Object.freeze({
  FREE: 0,
  SOLID: 1,
  WATER: 2,
  LOW_WALL: 3,
} as const);

export type CollisionCellKind = (typeof CollisionCell)[keyof typeof CollisionCell];

/** A map's collision at 8 px resolution, row by row; outside the grid counts as solid. */
export interface CollisionGrid {
  readonly w8: number;
  readonly h8: number;
  readonly cells: Uint8Array;
}
