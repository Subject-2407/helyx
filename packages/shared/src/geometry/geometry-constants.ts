/**
 * Fixed facts the geometry helpers rely on. Nothing outside the geometry folder should import
 * this file; collision cell sizes and kinds come from the shared network table and types.
 */

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
