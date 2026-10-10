/**
 * Duration of a status application. The default numbers of every status live in the shared
 * status table; ability and monster data may override magnitude and duration per application.
 */
import type { StatusId } from '../../types/combat.js';
import { K, STATUS_TABLE } from '../constants.js';

/** Status resist must stay below this, or harmful effects would last no time at all. */
const STATUS_RESIST_LIMIT = 1;

/** Seconds over which a knockback pushes its target. */
export const KNOCKBACK_PUSH_S = K.KNOCKBACK_PUSH_S;

/**
 * Duration of one application after status resist. `requestedS` overrides the default and is
 * held to the status's cap. Status resist shortens harmful effects only.
 */
export function statusDuration(name: StatusId, statusResist: number, requestedS?: number): number {
  if (!Number.isFinite(statusResist) || statusResist < 0 || statusResist >= STATUS_RESIST_LIMIT) {
    throw new RangeError(`status resist must be at least 0 and below 1, got ${statusResist}`);
  }
  const row = STATUS_TABLE[name];
  const asked = requestedS ?? row.durationS;
  if (!Number.isFinite(asked) || asked < 0) {
    throw new RangeError(`a status duration must be zero or more, got ${asked}`);
  }
  const capped = Math.min(asked, row.maxDurationS ?? asked);
  return row.harmful ? capped * (1 - statusResist) : capped;
}
