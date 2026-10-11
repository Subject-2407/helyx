/**
 * Rule tables that only Listener rules read: the attunement tiers, the strain bands and the
 * default row of the status that strain inflicts.
 */
import type { StatusId } from '../../types/combat.js';
import type { PublicStatusId, StatusRow } from '../tables/status.js';
import { K_LISTENER } from './constants.js';

/** Bands of the casting strain meter, from calm to its breaking point. */
export type DissonanceState = 'calm' | 'strained' | 'distorted' | 'fraying' | 'unbound';

/** Attunement bands of one Aspect. */
export type SyncTier = 'novice' | 'adept' | 'attuned' | 'mastery';

/** A band that starts at `min` (inclusive) and runs up to the next band's start. */
export interface Band<Name extends string> {
  readonly name: Name;
  readonly min: number;
}

/** Attunement tiers, lowest first. */
export const SYNC_TIER_TABLE: readonly Band<SyncTier>[] = Object.freeze([
  { name: 'novice', min: 0 },
  { name: 'adept', min: K_LISTENER.SYNC_TIER_ADEPT },
  { name: 'attuned', min: K_LISTENER.SYNC_TIER_ATTUNED },
  { name: 'mastery', min: K_LISTENER.SYNC_TIER_MASTERY },
]);

/** Strain states, calmest first. */
export const DISSONANCE_STATE_TABLE: readonly Band<DissonanceState>[] = Object.freeze([
  { name: 'calm', min: 0 },
  { name: 'strained', min: K_LISTENER.DIS_STRAINED },
  { name: 'distorted', min: K_LISTENER.DIS_DISTORTED },
  { name: 'fraying', min: K_LISTENER.DIS_FRAYING },
  { name: 'unbound', min: K_LISTENER.DIS_MAX },
]);

/** Every status whose default row lives here rather than in the public status table. */
export type ListenerStatusId = Exclude<StatusId, PublicStatusId>;

/**
 * Default row of the status a jarring hit leaves on a Listener: strain added per second for a
 * few seconds. The server merges this table with the public one.
 */
export const LISTENER_STATUS_TABLE: Readonly<Record<ListenerStatusId, StatusRow>> = Object.freeze({
  jarred: {
    magnitude: K_LISTENER.JARRED_PER_S,
    durationS: K_LISTENER.JARRED_DURATION_S,
    tickS: K_LISTENER.JARRED_TICK_S,
    stacking: 'refresh',
    harmful: true,
  },
});
