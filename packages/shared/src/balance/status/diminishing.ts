/**
 * Diminishing returns on crowd control between players. Each target keeps one record per
 * control kind (stun, root, slow), shared by every attacker. Inside one window the durations
 * fall from full to half to a quarter; the quarter application also makes the target immune to
 * that kind for a while, after which the record starts over.
 */
import type { StatusId } from '../../types/combat.js';
import { CC_DR_STEPS, K } from '../constants.js';

/** Control kinds that diminish between players. */
export const CC_DR_STATUSES: ReadonlySet<StatusId> = new Set<StatusId>(['stun', 'root', 'slow']);

export interface CcDrState {
  /** When the first application of the current window landed, in seconds. */
  readonly windowStartS: number;
  /** Applications counted in the current window. */
  readonly count: number;
  /** End of the immunity, once the target has become immune. */
  readonly immuneUntilS?: number;
}

export interface CcDrResult {
  /** Multiplier for the duration of this application; 0 means it does not land. */
  readonly mult: number;
  readonly next: CcDrState;
}

function startsOver(state: CcDrState | undefined, nowS: number): boolean {
  if (state === undefined) {
    return true;
  }
  if (state.immuneUntilS !== undefined) {
    return nowS >= state.immuneUntilS;
  }
  return nowS - state.windowStartS >= K.CC_DR_WINDOW_S;
}

/** Applies one control application of a kind to the target's record for that kind. */
export function ccDiminish(state: CcDrState | undefined, nowS: number): CcDrResult {
  if (state?.immuneUntilS !== undefined && nowS < state.immuneUntilS) {
    return { mult: 0, next: state };
  }
  const base: CcDrState | undefined = startsOver(state, nowS) ? undefined : state;
  const step = base?.count ?? 0;
  const mult = CC_DR_STEPS[step] ?? 0;
  const count = step + 1;
  const windowStartS = base?.windowStartS ?? nowS;
  if (count >= CC_DR_STEPS.length) {
    return { mult, next: { windowStartS, count, immuneUntilS: nowS + K.CC_DR_IMMUNE_S } };
  }
  return { mult, next: { windowStartS, count } };
}

/** Whether a status takes part in diminishing returns between players. */
export function diminishesInPvp(name: StatusId): boolean {
  return CC_DR_STATUSES.has(name);
}
