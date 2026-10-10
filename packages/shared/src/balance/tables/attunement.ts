import type { DissonanceState, SyncTier } from '../../types/combat.js';
import { ATTUNEMENT_K as K } from '../constants/attunement.js';

/** A band that starts at `min` (inclusive) and runs up to the next band's start. */
export interface Band<Name extends string> {
  readonly name: Name;
  readonly min: number;
}

/** Attunement tiers, lowest first. */
export const SYNC_TIER_TABLE: readonly Band<SyncTier>[] = Object.freeze([
  { name: 'novice', min: 0 },
  { name: 'adept', min: K.SYNC_TIER_ADEPT },
  { name: 'attuned', min: K.SYNC_TIER_ATTUNED },
  { name: 'mastery', min: K.SYNC_TIER_MASTERY },
]);

/** Strain states, calmest first. */
export const DISSONANCE_STATE_TABLE: readonly Band<DissonanceState>[] = Object.freeze([
  { name: 'calm', min: 0 },
  { name: 'strained', min: K.DIS_STRAINED },
  { name: 'distorted', min: K.DIS_DISTORTED },
  { name: 'fraying', min: K.DIS_FRAYING },
  { name: 'unbound', min: K.DIS_MAX },
]);
