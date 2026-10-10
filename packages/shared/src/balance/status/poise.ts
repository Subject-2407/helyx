/**
 * Poise: every damaging hit wears it down, and a character whose poise breaks is staggered.
 * Poise comes back in full once the character has gone long enough without poise damage.
 */

/**
 * Tuning values for poise. They mirror the shared balance table and move there once that table
 * exists; nothing outside the status modules should import them.
 */
const POISE_K = Object.freeze({
  POISE_PLAYER_BASE: 30,
  POISE_BODY_ARMOR_MAX: 40,
  POISE_REGEN_DELAY_S: 2,
  POISE_BOSS_REGEN_DELAY_S: 4,
  POISE_HIT_BASIC: 10,
  POISE_HIT_DAGGER: 6,
  POISE_HIT_GREATSWORD: 25,
  POISE_HIT_BOW_CHARGED: 20,
} as const);

/** Monster archetypes as far as poise is concerned. Boss values are per boss phase. */
export type PoiseArchetype =
  | 'fodder'
  | 'standard'
  | 'skirmisher'
  | 'caster'
  | 'brute'
  | 'elite'
  | 'instance_boss'
  | 'trial_boss'
  | 'boss';

interface ArchetypePoise {
  readonly poise: number;
  readonly isBoss: boolean;
}

export const ARCHETYPE_POISE: Readonly<Record<PoiseArchetype, ArchetypePoise>> = Object.freeze({
  fodder: { poise: 10, isBoss: false },
  standard: { poise: 30, isBoss: false },
  skirmisher: { poise: 25, isBoss: false },
  caster: { poise: 20, isBoss: false },
  brute: { poise: 80, isBoss: false },
  elite: { poise: 150, isBoss: false },
  instance_boss: { poise: 300, isBoss: true },
  trial_boss: { poise: 250, isBoss: true },
  boss: { poise: 400, isBoss: true },
});

/** Default poise damage of a basic hit by weapon kind; abilities set their own. */
export type PoiseHitKind = 'basic' | 'dagger' | 'greatsword' | 'bow_charged';

export const DEFAULT_POISE_DAMAGE: Readonly<Record<PoiseHitKind, number>> = Object.freeze({
  basic: POISE_K.POISE_HIT_BASIC,
  dagger: POISE_K.POISE_HIT_DAGGER,
  greatsword: POISE_K.POISE_HIT_GREATSWORD,
  bow_charged: POISE_K.POISE_HIT_BOW_CHARGED,
});

/** Player poise: a fixed base plus what the body armor adds. */
export function playerPoise(bodyArmorPoise: number): number {
  if (
    !Number.isFinite(bodyArmorPoise) ||
    bodyArmorPoise < 0 ||
    bodyArmorPoise > POISE_K.POISE_BODY_ARMOR_MAX
  ) {
    throw new RangeError(
      `body armor poise must be between 0 and ${POISE_K.POISE_BODY_ARMOR_MAX}, got ${bodyArmorPoise}`,
    );
  }
  return POISE_K.POISE_PLAYER_BASE + bodyArmorPoise;
}

/** Poise of a monster archetype (per phase for bosses). */
export function archetypePoise(archetype: PoiseArchetype): number {
  return ARCHETYPE_POISE[archetype].poise;
}

/** Seconds without poise damage before poise refills; bosses wait longer. */
export function poiseRegenDelayS(isBoss: boolean): number {
  return isBoss ? POISE_K.POISE_BOSS_REGEN_DELAY_S : POISE_K.POISE_REGEN_DELAY_S;
}

export interface PoiseState {
  readonly current: number;
  readonly max: number;
  /** When poise damage last landed, in seconds; `undefined` if never. */
  readonly lastDamageS?: number;
}

export interface PoiseHitResult {
  readonly state: PoiseState;
  /** True when this hit broke poise and the target is staggered. */
  readonly broken: boolean;
}

/**
 * Applies poise damage. A break refills poise at once, so the next stagger needs a full bar of
 * poise damage again instead of every following hit staggering.
 */
export function applyPoiseDamage(state: PoiseState, amount: number, nowS: number): PoiseHitResult {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`poise damage must be zero or more, got ${amount}`);
  }
  const left = state.current - amount;
  if (left <= 0 && amount > 0) {
    return { state: { current: state.max, max: state.max, lastDamageS: nowS }, broken: true };
  }
  return { state: { current: left, max: state.max, lastDamageS: nowS }, broken: false };
}

/** Refills poise once the regen delay has passed since the last poise damage. */
export function regenPoise(state: PoiseState, nowS: number, isBoss: boolean): PoiseState {
  if (state.lastDamageS === undefined || state.current >= state.max) {
    return state;
  }
  if (nowS - state.lastDamageS < poiseRegenDelayS(isBoss)) {
    return state;
  }
  return { current: state.max, max: state.max, lastDamageS: state.lastDamageS };
}
