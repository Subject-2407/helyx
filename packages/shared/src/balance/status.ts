/**
 * Status effects, crowd-control diminishing returns and poise. The rules live in the `status`
 * folder, one concern per file; this module is their single entry point.
 */
export {
  KNOCKBACK_PUSH_S,
  STATUS_DEFAULTS,
  STATUS_NAMES,
  statusDuration,
  type StackingKind,
  type StatusDefaults,
  type StatusName,
} from './status/defaults.js';
export {
  applyStatus,
  DEFAULT_STACKING_RULES,
  type ActiveStatus,
  type StackingOutcome,
  type StackingRule,
  type StatusApplication,
} from './status/stacking.js';
export { bleedTickDamage, burnTickDamage, dotTickCount } from './status/dot.js';
export {
  CC_DR_STATUSES,
  ccDiminish,
  diminishesInPvp,
  type CcDrResult,
  type CcDrState,
} from './status/diminishing.js';
export {
  applyPoiseDamage,
  ARCHETYPE_POISE,
  archetypePoise,
  DEFAULT_POISE_DAMAGE,
  playerPoise,
  poiseRegenDelayS,
  regenPoise,
  type PoiseArchetype,
  type PoiseHitKind,
  type PoiseHitResult,
  type PoiseState,
} from './status/poise.js';
