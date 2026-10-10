/**
 * Diminishing returns on crowd control between players. Each target keeps one record per
 * control kind (stun, root, slow), shared by every attacker. Inside one window the durations
 * fall from full to half to a quarter; the quarter application also makes the target immune to
 * that kind for a while, after which the record starts over.
 */
import type { StatusName } from './defaults.js';

/**
 * Tuning values for diminishing returns. They mirror the shared balance table and move there
 * once that table exists; nothing outside the status modules should import them.
 */
const CC_DR_K = Object.freeze({
  CC_DR_WINDOW_S: 10,
  CC_DR_IMMUNE_S: 10,
} as const);

/** Duration multiplier of the first, second and third application inside one window. */
const CC_DR_STEPS: readonly number[] = Object.freeze([1, 0.5, 0.25]);

/** Control kinds that diminish between players. */
export const CC_DR_STATUSES: ReadonlySet<StatusName> = new Set<StatusName>([
  'stun',
  'root',
  'slow',
]);

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
  return nowS - state.windowStartS >= CC_DR_K.CC_DR_WINDOW_S;
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
    return { mult, next: { windowStartS, count, immuneUntilS: nowS + CC_DR_K.CC_DR_IMMUNE_S } };
  }
  return { mult, next: { windowStartS, count } };
}

/** Whether a status takes part in diminishing returns between players. */
export function diminishesInPvp(name: StatusName): boolean {
  return CC_DR_STATUSES.has(name);
}
