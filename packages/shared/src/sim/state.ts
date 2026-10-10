/** The data the movement step reads and writes. */
import type { Dir8 } from '../types/movement.js';

export interface MoveState {
  /** Feet position in px, always a multiple of 1/64. */
  readonly x: number;
  readonly y: number;
  readonly dashMs: number;
  readonly dashDir: Dir8;
  readonly dashCdMs: number;
  readonly knockMs: number;
  /** Knockback velocity in px/s while `knockMs` runs. */
  readonly knockVx: number;
  readonly knockVy: number;
  /** Kept to one decimal after each step. */
  readonly stamina: number;
  readonly staDelayMs: number;
  readonly facing: 1 | -1;
}

export interface MoveParams {
  /** Move speed in px/s from the last acknowledgement (stats, statuses and load applied). */
  readonly speed: number;
  /** Multiplier from the current action: guard, bow draw, attack or ability phase, else 1. */
  readonly actionMult: number;
  /** Movement flags from the last acknowledgement. */
  readonly mflags: number;
  /** Stamina a dash costs; infinite when the load forbids dashing. */
  readonly dashCost: number;
  /** For stamina regeneration. */
  readonly agi: number;
  /** Stamina does not regenerate while guarding. */
  readonly guarding: boolean;
  /** Regeneration stops here. */
  readonly maxStamina: number;
}

/** One 60 Hz frame of player input. */
export interface FrameInput {
  readonly move: Dir8;
  readonly dashPressed: boolean;
}
