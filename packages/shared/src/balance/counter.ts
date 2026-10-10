/**
 * Aspect counters: an Aspect-tagged attack is stronger against a target made of the principle it
 * beats and weaker against the one that beats it. Physical attacks have no tags and are neutral.
 */

/**
 * Tuning values for counters. They mirror the shared balance table key for key and move there
 * once that table exists; nothing outside this module should import them.
 */
const COUNTER_K = Object.freeze({
  CTR_ADV: 0.3,
  CTR_DIS: 0.15,
  CTR_VULN: 0.2,
  CTR_MIN: 0.7,
  CTR_MAX: 1.45,
  CTR_PRIMARY_WEIGHT: 1,
  CTR_SECONDARY_WEIGHT: 0.5,
} as const);

/** The six Aspects, in their canonical order. */
export const ASPECT_TAGS = Object.freeze([
  'growth',
  'entropy',
  'order',
  'change',
  'force',
  'void',
] as const);

export type AspectTag = (typeof ASPECT_TAGS)[number];

/** Which Aspect each Aspect beats. Following it from any Aspect visits all six once. */
export const COUNTER_BEATS: Readonly<Record<AspectTag, AspectTag>> = Object.freeze({
  entropy: 'growth',
  order: 'entropy',
  change: 'order',
  force: 'change',
  void: 'force',
  growth: 'void',
});

/** What a target is made of, as far as counters and resists are concerned. */
export interface AspectProfile {
  readonly primary?: AspectTag;
  readonly secondary?: AspectTag;
  readonly vulnerable?: readonly AspectTag[];
}

/** +1 if `tag` beats `aspect`, −1 if `aspect` beats `tag`, 0 otherwise (also for the same Aspect). */
export function relation(tag: AspectTag, aspect: AspectTag): -1 | 0 | 1 {
  if (COUNTER_BEATS[tag] === aspect) {
    return 1;
  }
  if (COUNTER_BEATS[aspect] === tag) {
    return -1;
  }
  return 0;
}

function rankContribution(tag: AspectTag, aspect: AspectTag | undefined, weight: number): number {
  if (aspect === undefined) {
    return 0;
  }
  const rel = relation(tag, aspect);
  if (rel > 0) {
    return weight * COUNTER_K.CTR_ADV;
  }
  if (rel < 0) {
    return -weight * COUNTER_K.CTR_DIS;
  }
  return 0;
}

/** Bonus (or penalty) one attack tag earns against a profile, before averaging and clamping. */
export function perTagCounter(tag: AspectTag, profile: AspectProfile): number {
  const vulnerable = profile.vulnerable?.includes(tag) === true ? COUNTER_K.CTR_VULN : 0;
  return (
    rankContribution(tag, profile.primary, COUNTER_K.CTR_PRIMARY_WEIGHT) +
    rankContribution(tag, profile.secondary, COUNTER_K.CTR_SECONDARY_WEIGHT) +
    vulnerable
  );
}

/** Keeps a counter multiplier inside its allowed range. */
export function clampCounter(multiplier: number): number {
  return Math.min(COUNTER_K.CTR_MAX, Math.max(COUNTER_K.CTR_MIN, multiplier));
}

/** Counter multiplier of an attack with `tags` against `profile`; an untagged attack gives 1. */
export function counterMultiplier(tags: readonly AspectTag[], profile: AspectProfile): number {
  if (tags.length === 0) {
    return 1;
  }
  let total = 0;
  for (const tag of tags) {
    total += perTagCounter(tag, profile);
  }
  return clampCounter(1 + total / tags.length);
}
