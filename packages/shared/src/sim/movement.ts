/**
 * The fixed-step movement simulation. Client prediction and the server's authoritative
 * movement call the same `stepMove` with the same inputs and must get bit-identical results,
 * so it only uses `+ − × ÷`, `Math.round/floor/min/max/abs/sign` and constants, never reads
 * the time and never iterates object keys.
 */
import { dashSpeedPxS, staminaRegenPerS } from '../balance/movement.js';
import { NET } from '../net-constants.js';
import { MS_PER_S } from '../time/clock-constants.js';
import { MoveFlag, type CollisionGrid } from '../types/movement.js';
import { resolveX, resolveY } from './collision.js';
import { canStartDash, isImmobilized, startDash } from './dash.js';
import { dirVector } from './dir8.js';
import { quantizePos, quantizeStamina } from './fixed.js';
import type { FrameInput, MoveParams, MoveState } from './state.js';

const DT = NET.SIM_DT;
const DT_MS = MS_PER_S * NET.SIM_DT;
const DASH_SPEED = dashSpeedPxS();

/** Share of this frame a timer still covers, so a run that ends mid-frame moves only that far. */
function activeShare(remainingMs: number): number {
  return Math.min(DT_MS, remainingMs) / DT_MS;
}

function velocity(s: MoveState, input: FrameInput, p: MoveParams): readonly [number, number] {
  if (s.knockMs > 0) {
    const share = activeShare(s.knockMs);
    return [s.knockVx * share, s.knockVy * share];
  }
  if (isImmobilized(p.mflags)) {
    return [0, 0];
  }
  if (s.dashMs > 0) {
    const [dx, dy] = dirVector(s.dashDir);
    const speed = DASH_SPEED * activeShare(s.dashMs);
    return [dx * speed, dy * speed];
  }
  if ((p.mflags & MoveFlag.ROOTED) !== 0) {
    return [0, 0];
  }
  const [dx, dy] = dirVector(input.move);
  const speed = p.speed * p.actionMult;
  return [dx * speed, dy * speed];
}

function countDown(ms: number): number {
  return Math.max(0, ms - DT_MS);
}

function regenStamina(stamina: number, delayMs: number, p: MoveParams): number {
  if (delayMs > 0 || p.guarding) {
    return quantizeStamina(stamina);
  }
  return quantizeStamina(Math.min(p.maxStamina, stamina + staminaRegenPerS(p.agi) * DT));
}

/** Advances one 60 Hz frame. Pure: returns a new state and never changes its inputs. */
export function stepMove(
  state: MoveState,
  input: FrameInput,
  p: MoveParams,
  grid: CollisionGrid,
): MoveState {
  const s = canStartDash(state, input, p) ? startDash(state, input, p) : state;
  const [vx, vy] = velocity(s, input, p);
  const x = quantizePos(resolveX(grid, s.x, s.y, s.x + vx * DT));
  const y = quantizePos(resolveY(grid, x, s.y, s.y + vy * DT));
  const staDelayMs = countDown(s.staDelayMs);
  return {
    x,
    y,
    dashMs: countDown(s.dashMs),
    dashDir: s.dashDir,
    dashCdMs: countDown(s.dashCdMs),
    knockMs: countDown(s.knockMs),
    knockVx: s.knockVx,
    knockVy: s.knockVy,
    stamina: regenStamina(s.stamina, staDelayMs, p),
    staDelayMs,
    facing: vx === 0 ? s.facing : vx > 0 ? 1 : -1,
  };
}
