import { FULL_TURN_RAD, WIRE_ANGLE_STEPS } from './geometry-constants.js';

/**
 * Aim angles are radians with 0 pointing east and growing clockwise on screen (y points down),
 * so the unit vector of an angle is simply (cos, sin).
 */

/** Converts a uint16 wire angle into radians in [0, 2π). */
export function wireAngleToRadians(wire: number): number {
  if (!Number.isInteger(wire) || wire < 0 || wire >= WIRE_ANGLE_STEPS) {
    throw new RangeError(`Wire angle must be an integer in [0, ${WIRE_ANGLE_STEPS}), got ${wire}`);
  }
  return (wire / WIRE_ANGLE_STEPS) * FULL_TURN_RAD;
}

/** Converts any finite angle in radians into the nearest uint16 wire angle. */
export function radiansToWireAngle(radians: number): number {
  if (!Number.isFinite(radians)) {
    throw new RangeError(`Aim angle must be finite, got ${radians}`);
  }
  const steps = Math.round((radians / FULL_TURN_RAD) * WIRE_ANGLE_STEPS);
  return ((steps % WIRE_ANGLE_STEPS) + WIRE_ANGLE_STEPS) % WIRE_ANGLE_STEPS;
}
