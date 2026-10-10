/**
 * Casting an Aspect ability: what it costs and how hard it hits in each cast mode.
 *
 * The force mode spends Mana and works for everyone. The sync mode spends Dissonance instead,
 * needs attunement in every tag, and its power follows attunement and the local resonance. The
 * force-mode functions here must stay usable without the dissonance, resonance and sync modules,
 * so this file never imports them.
 */
import type { AspectTag } from './counter.js';
import { profCostMult } from './proficiency.js';

/**
 * Tuning values for casting. They mirror the shared balance table key for key and move there
 * once that table exists; nothing outside this module should import them.
 */
const CAST_K = Object.freeze({
  SYNC_MAX: 100,
  SYNC_EFFECT: 0.15,
  SYNC_MANA_RED: 0.4,
  SYNC_DIS_RED: 0.95,
  SYNC_DIS_EXP: 1.5,
  SP_BASE: 0.75,
  SP_SYNC: 0.35,
  SP_RES: 0.2,
  SP_MIN: 0.55,
  SP_MAX: 1.3,
  SYNC_MIN_CAST: 5,
  SYNC_WINDUP: 0.1,
  SYNC_INTERRUPT_DIS: 10,
  OC_HOLD: 0.35,
  OC_COST: 1.5,
  OC_POWER: 1.25,
  DIS_DECIMALS: 1,
  RES_MIN: -1,
  RES_MAX: 1,
} as const);

export type CastingMode = 'force' | 'sync';

/** Attunement per Aspect; Aspects that are missing count as 0. */
export type SyncByTag = Readonly<Partial<Record<AspectTag, number>>>;

/** Lowest attunement every tag needs before the sync mode can be used. */
export const MIN_SYNC_TO_CAST = CAST_K.SYNC_MIN_CAST;

function assertSync(s: number): void {
  if (!Number.isFinite(s) || s < 0 || s > CAST_K.SYNC_MAX) {
    throw new RangeError(`attunement must be between 0 and ${CAST_K.SYNC_MAX}, got ${s}`);
  }
}

function assertCost(base: number): void {
  if (!Number.isFinite(base) || base < 0) {
    throw new RangeError(`a base cost must be zero or more, got ${base}`);
  }
}

function roundToDecimals(x: number, decimals: number): number {
  const scale = 10 ** decimals;
  return Math.round(x * scale) / scale;
}

/**
 * Attunement the caster brings to an ability: the mean over its tags. A caster who is not a
 * Listener always counts as 0, whatever is stored for them.
 */
export function effectiveSync(
  syncByTag: SyncByTag,
  tags: readonly AspectTag[],
  isListener: boolean,
): number {
  if (!isListener || tags.length === 0) {
    return 0;
  }
  let total = 0;
  for (const tag of tags) {
    total += syncByTag[tag] ?? 0;
  }
  return total / tags.length;
}

/** Effect multiplier from attunement; it applies in both cast modes. */
export function syncEffectBonus(s: number): number {
  assertSync(s);
  return 1 + (CAST_K.SYNC_EFFECT * s) / CAST_K.SYNC_MAX;
}

/** Whole Mana a force-mode cast costs. Overcharge must already have been allowed. */
export function forceManaCost(
  baseMana: number,
  s: number,
  prof: number,
  overcharge: boolean,
): number {
  assertCost(baseMana);
  assertSync(s);
  const attunement = 1 - (CAST_K.SYNC_MANA_RED * s) / CAST_K.SYNC_MAX;
  const charge = overcharge ? CAST_K.OC_COST : 1;
  return Math.round(baseMana * attunement * profCostMult(prof) * charge);
}

/** Power multiplier of a force-mode cast. */
export function forcePower(overcharge: boolean): number {
  return overcharge ? CAST_K.OC_POWER : 1;
}

/** Dissonance a sync-mode cast costs, kept to one decimal. */
export function syncDissonanceCost(baseDissonance: number, s: number, prof: number): number {
  assertCost(baseDissonance);
  assertSync(s);
  const relief = (1 - (CAST_K.SYNC_DIS_RED * s) / CAST_K.SYNC_MAX) ** CAST_K.SYNC_DIS_EXP;
  return roundToDecimals(baseDissonance * relief * profCostMult(prof), CAST_K.DIS_DECIMALS);
}

/** Power multiplier of a sync-mode cast at attunement `s` and mean local resonance `rbar`. */
export function syncPower(s: number, rbar: number): number {
  assertSync(s);
  if (!Number.isFinite(rbar) || rbar < CAST_K.RES_MIN || rbar > CAST_K.RES_MAX) {
    throw new RangeError(
      `resonance must be between ${CAST_K.RES_MIN} and ${CAST_K.RES_MAX}, got ${rbar}`,
    );
  }
  const raw = CAST_K.SP_BASE + (CAST_K.SP_SYNC * s) / CAST_K.SYNC_MAX + CAST_K.SP_RES * rbar;
  return Math.min(CAST_K.SP_MAX, Math.max(CAST_K.SP_MIN, raw));
}

/** Whether the sync mode is allowed: only Listeners, and only with enough attunement in every tag. */
export function canSyncCast(
  syncByTag: SyncByTag,
  tags: readonly AspectTag[],
  isListener: boolean,
): boolean {
  if (!isListener || tags.length === 0) {
    return false;
  }
  return tags.every((tag) => (syncByTag[tag] ?? 0) >= CAST_K.SYNC_MIN_CAST);
}

export interface OverchargeRequest {
  readonly mode: CastingMode;
  /** Whether the ability's data marks it as able to overcharge. */
  readonly overchargeable: boolean;
  /** How long the key was held before release, in seconds. */
  readonly holdS: number;
}

/** Overcharge needs the force mode, an able ability, and a long enough hold. */
export function canOvercharge(request: OverchargeRequest): boolean {
  return request.mode === 'force' && request.overchargeable && request.holdS >= CAST_K.OC_HOLD;
}

/** How a hit was cast, as far as its power multiplier is concerned. */
export type CastModeInput =
  | { readonly kind: 'physical' }
  | { readonly kind: 'force'; readonly overcharge: boolean }
  | { readonly kind: 'sync'; readonly s: number; readonly rbar: number };

/** Power multiplier of a cast in its mode; physical abilities are unaffected by cast mode. */
export function castModeMult(mode: CastModeInput): number {
  switch (mode.kind) {
    case 'physical':
      return 1;
    case 'force':
      return forcePower(mode.overcharge);
    case 'sync':
      return syncPower(mode.s, mode.rbar);
  }
}

/** Seconds the sync mode adds to an Aspect ability's wind-up. */
export function syncWindupPenaltyS(): number {
  return CAST_K.SYNC_WINDUP;
}

/** Dissonance added when a sync-mode wind-up is broken by a stun or stagger. */
export function syncInterruptDissonance(): number {
  return CAST_K.SYNC_INTERRUPT_DIS;
}

/** Whole Stamina a physical ability costs at the given proficiency. */
export function staminaAbilityCost(baseStamina: number, prof: number): number {
  assertCost(baseStamina);
  return Math.round(baseStamina * profCostMult(prof));
}
