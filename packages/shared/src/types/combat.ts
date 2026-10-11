/** Monster archetypes, from the weakest template to the world boss. */
export const ARCHETYPES = Object.freeze([
  'fodder',
  'standard',
  'skirmisher',
  'caster',
  'brute',
  'elite',
  'instance_boss',
  'trial_boss',
  'boss',
] as const);

export type Archetype = (typeof ARCHETYPES)[number];

/** Every status effect a hit or ability can apply. */
export const STATUS_IDS = Object.freeze([
  'burn',
  'bleed',
  'corrode',
  'slow',
  'root',
  'stun',
  'knockback',
  'weaken',
  'exposed',
  'mending',
  'haste',
  'fortify',
  'dispelled',
  'jarred',
] as const);

export type StatusId = (typeof STATUS_IDS)[number];

/**
 * How an Aspect ability is cast: `force` spends Mana the usual way, and `scaled` is any other mode
 * whose cost and power are worked out elsewhere and handed in as plain factors.
 */
export type CastMode = 'force' | 'scaled';

/** Load bands: 0 normal, 1 burdened, 2 heavily burdened, 3 overloaded. */
export type EncumbranceTier = 0 | 1 | 2 | 3;
