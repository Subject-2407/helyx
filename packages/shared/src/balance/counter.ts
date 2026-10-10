/**
 * Aspect counters: an Aspect-tagged attack is stronger against a target made of the principle it
 * beats and weaker against the one that beats it. Physical attacks have no tags and are neutral.
 */
import type { Aspect } from '../types/aspect.js';
import { ASPECT_BEATS, K } from './constants.js';
import { clamp } from './math.js';

/** What a target is made of, as far as counters and resists are concerned. */
export interface AspectProfile {
  readonly primary?: Aspect;
  readonly secondary?: Aspect;
  readonly vulnerable?: readonly Aspect[];
}

/** +1 if `tag` beats `aspect`, −1 if `aspect` beats `tag`, 0 otherwise (also for the same Aspect). */
export function relation(tag: Aspect, aspect: Aspect): -1 | 0 | 1 {
  if (ASPECT_BEATS[tag] === aspect) {
    return 1;
  }
  if (ASPECT_BEATS[aspect] === tag) {
    return -1;
  }
  return 0;
}

function rankContribution(tag: Aspect, aspect: Aspect | undefined, weight: number): number {
  if (aspect === undefined) {
    return 0;
  }
  const rel = relation(tag, aspect);
  if (rel > 0) {
    return weight * K.CTR_ADV;
  }
  if (rel < 0) {
    return -weight * K.CTR_DIS;
  }
  return 0;
}

/** Bonus (or penalty) one attack tag earns against a profile, before averaging and clamping. */
export function perTagCounter(tag: Aspect, profile: AspectProfile): number {
  const vulnerable = profile.vulnerable?.includes(tag) === true ? K.CTR_VULN : 0;
  return (
    rankContribution(tag, profile.primary, K.CTR_PRIMARY_WEIGHT) +
    rankContribution(tag, profile.secondary, K.CTR_SECONDARY_WEIGHT) +
    vulnerable
  );
}

/** Keeps a counter multiplier inside its allowed range. */
export function clampCounter(multiplier: number): number {
  return clamp(multiplier, K.CTR_MIN, K.CTR_MAX);
}

/** Counter multiplier of an attack with `tags` against `profile`; an untagged attack gives 1. */
export function counterMultiplier(tags: readonly Aspect[], profile: AspectProfile): number {
  if (tags.length === 0) {
    return 1;
  }
  let total = 0;
  for (const tag of tags) {
    total += perTagCounter(tag, profile);
  }
  return clampCounter(1 + total / tags.length);
}

/**
 * Resist a monster has against each Aspect: its explicit values, else the default resist
 * against its own primary Aspect ("it is made of that principle"), else 0.
 */
export function monsterResist(
  aspect: Aspect,
  profile: AspectProfile,
  explicit?: Readonly<Partial<Record<Aspect, number>>>,
): number {
  const value = explicit?.[aspect];
  if (value !== undefined) {
    return value;
  }
  return profile.primary === aspect ? K.MON_PRIMARY_RESIST : 0;
}
