/** When a dash may start, and what starting one does to the movement state. */
import { dashTimings } from '../balance/movement.js';
import { MoveFlag } from '../types/movement.js';
import { facingDir } from './dir8.js';
import type { FrameInput, MoveParams, MoveState } from './state.js';

/** Flags that stop all self-driven motion (knockback still moves the character). */
export const IMMOBILIZING_FLAGS =
  MoveFlag.TRANSIT | MoveFlag.DEAD | MoveFlag.STUNNED | MoveFlag.IMMOBILE | MoveFlag.DOWNED;

const TIMINGS = dashTimings();

export function isImmobilized(mflags: number): boolean {
  return (mflags & IMMOBILIZING_FLAGS) !== 0;
}

/**
 * A dash starts on a press when none is running or cooling down, nothing forbids it (flags or
 * load) and enough stamina is left.
 */
export function canStartDash(s: MoveState, input: FrameInput, p: MoveParams): boolean {
  return (
    input.dashPressed &&
    s.dashMs === 0 &&
    s.dashCdMs === 0 &&
    !isImmobilized(p.mflags) &&
    (p.mflags & (MoveFlag.NO_DASH | MoveFlag.ROOTED)) === 0 &&
    s.stamina >= p.dashCost
  );
}

/** Starts a dash toward the input direction, or the facing direction without input. */
export function startDash(s: MoveState, input: FrameInput, p: MoveParams): MoveState {
  return {
    ...s,
    dashMs: TIMINGS.durationMs,
    dashDir: input.move !== 0 ? input.move : facingDir(s.facing),
    stamina: s.stamina - p.dashCost,
    staDelayMs: TIMINGS.staminaDelayMs,
    dashCdMs: TIMINGS.cooldownMs,
  };
}
