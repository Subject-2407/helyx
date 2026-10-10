/**
 * Fixed facts the geometry helpers rely on. The collision grid values mirror how maps are
 * baked; they move to the shared network and type tables once those exist, and nothing
 * outside the geometry folder should import this file.
 */

/** Side of one collision grid cell in px. */
export const SIGHT_CELL_PX = 8;

/** Collision cell kind that blocks sight and projectiles. Water and low walls do not. */
export const SIGHT_BLOCKING_CELL = 1;

/** Number of distinct aim angles on the wire (a uint16 covers one full turn). */
export const WIRE_ANGLE_STEPS = 65_536;

export const FULL_TURN_RAD = 2 * Math.PI;
export const DEG_TO_RAD = Math.PI / 180;

/**
 * Slack for comparisons after trigonometry, in px or radians. Large enough to absorb rounding
 * from sin/cos, far below the 1/64 px resolution of positions, so exact edge contact still
 * counts as a hit.
 */
export const GEOMETRY_EPS = 1e-9;
