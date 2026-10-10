/**
 * What happens when a status is applied to a target that may already carry it. Each stacking
 * kind has its own rule in a registry, so a new kind is added by registering a rule rather than
 * by editing a switch.
 */
import type { StackingKind, StatusName } from './defaults.js';
import { STATUS_DEFAULTS } from './defaults.js';

/** One status currently running on a target. Times are seconds on the room clock. */
export interface ActiveStatus {
  readonly name: StatusName;
  readonly magnitude: number;
  readonly untilS: number;
  readonly stacks: number;
}

/** A new application, with its duration already adjusted for status resist. */
export interface StatusApplication {
  readonly name: StatusName;
  readonly magnitude: number;
  readonly durationS: number;
  readonly nowS: number;
}

export interface StackingOutcome {
  /** What runs on the target afterwards; `undefined` when nothing lasting remains. */
  readonly status: ActiveStatus | undefined;
  /** Whether the new application changed anything. */
  readonly applied: boolean;
}

/** A stacking rule. `running` is the same status on the target if it has not run out yet. */
export type StackingRule = (
  running: ActiveStatus | undefined,
  incoming: StatusApplication,
) => StackingOutcome;

function fresh(incoming: StatusApplication, stacks = 1): ActiveStatus {
  return {
    name: incoming.name,
    magnitude: incoming.magnitude,
    untilS: incoming.nowS + incoming.durationS,
    stacks,
  };
}

function maxStacksOf(name: StatusName): number {
  return STATUS_DEFAULTS[name].maxStacks ?? 1;
}

const refresh: StackingRule = (_running, incoming) => ({
  status: fresh(incoming),
  applied: true,
});

const stack: StackingRule = (running, incoming) => {
  const stacks = Math.min(maxStacksOf(incoming.name), (running?.stacks ?? 0) + 1);
  return { status: fresh(incoming, stacks), applied: true };
};

/** Magnitudes may be signed (a slow is negative), so strength is the size of the number. */
const strongest: StackingRule = (running, incoming) => {
  if (running !== undefined && Math.abs(incoming.magnitude) < Math.abs(running.magnitude)) {
    return { status: running, applied: false };
  }
  return { status: fresh(incoming), applied: true };
};

const noRefresh: StackingRule = (running, incoming) => {
  if (running !== undefined) {
    return { status: running, applied: false };
  }
  return { status: fresh(incoming), applied: true };
};

const instant: StackingRule = (running) => ({ status: running, applied: true });

/** The stacking rule of every kind the game knows. */
export const DEFAULT_STACKING_RULES: ReadonlyMap<StackingKind, StackingRule> = new Map<
  StackingKind,
  StackingRule
>([
  ['refresh', refresh],
  ['stack', stack],
  ['strongest', strongest],
  ['no_refresh', noRefresh],
  ['instant', instant],
]);

/**
 * Applies a status on top of what the target already carries. `current` may have run out; it
 * then counts as absent.
 */
export function applyStatus(
  current: ActiveStatus | undefined,
  incoming: StatusApplication,
  rules: ReadonlyMap<StackingKind, StackingRule> = DEFAULT_STACKING_RULES,
): StackingOutcome {
  const kind = STATUS_DEFAULTS[incoming.name].stacking;
  const rule = rules.get(kind);
  if (rule === undefined) {
    throw new Error(`no stacking rule is registered for ${kind}`);
  }
  if (current !== undefined && current.name !== incoming.name) {
    throw new Error(`cannot stack ${incoming.name} onto ${current.name}`);
  }
  const running = current !== undefined && current.untilS > incoming.nowS ? current : undefined;
  return rule(running, incoming);
}
