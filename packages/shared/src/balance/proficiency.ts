/**
 * Ability proficiency: each ability levels from 1 to 10 through use. Every level above the first
 * makes the ability a little stronger and a little cheaper.
 */

/**
 * Tuning values for proficiency. They mirror the shared balance table key for key and move
 * there once that table exists; nothing outside this module should import them.
 */
const PROF_K = Object.freeze({
  PROF_DMG: 0.03,
  PROF_COST: 0.02,
  PROF_MAX: 10,
  PROF_XP_PER_LEVEL: 20,
  PROF_USE_ICD_S: 1.5,
} as const);

/** The level every ability starts at. */
const PROF_MIN = 1;

/** The highest proficiency level an ability can reach. */
export const PROF_MAX_LEVEL = PROF_K.PROF_MAX;

/** Seconds that must pass between two uses of one ability that each grant experience. */
export const PROF_USE_COOLDOWN_S = PROF_K.PROF_USE_ICD_S;

export interface ProfProgress {
  readonly level: number;
  /** Experience collected toward the next level. */
  readonly xp: number;
}

function assertProf(prof: number): void {
  if (!Number.isInteger(prof) || prof < PROF_MIN || prof > PROF_K.PROF_MAX) {
    throw new RangeError(
      `proficiency must be a whole number from ${PROF_MIN} to ${PROF_K.PROF_MAX}, got ${prof}`,
    );
  }
}

/** Damage and effect multiplier of an ability at the given proficiency. */
export function profDamageMult(prof: number): number {
  assertProf(prof);
  return 1 + PROF_K.PROF_DMG * (prof - PROF_MIN);
}

/** Cost multiplier (Mana, Stamina and the other casting resource) at the given proficiency. */
export function profCostMult(prof: number): number {
  assertProf(prof);
  return 1 - PROF_K.PROF_COST * (prof - PROF_MIN);
}

/** Experience needed to go from `prof` to the next level. The highest level has no next one. */
export function profXpToNext(prof: number): number {
  assertProf(prof);
  if (prof >= PROF_K.PROF_MAX) {
    throw new RangeError(`proficiency ${prof} is already the highest level`);
  }
  return PROF_K.PROF_XP_PER_LEVEL * prof;
}

/** Experience needed to take an ability from the first to the highest level. */
export function totalProfXpToMax(): number {
  let total = 0;
  for (let prof = PROF_MIN; prof < PROF_K.PROF_MAX; prof += 1) {
    total += profXpToNext(prof);
  }
  return total;
}

/** Adds experience, levelling up as often as it allows. Experience past the highest level is lost. */
export function addProfXp(progress: ProfProgress, xp: number): ProfProgress {
  assertProf(progress.level);
  if (!Number.isFinite(xp) || xp < 0) {
    throw new RangeError(`proficiency experience must be zero or more, got ${xp}`);
  }
  let level = progress.level;
  let pool = progress.xp + xp;
  while (level < PROF_K.PROF_MAX && pool >= profXpToNext(level)) {
    pool -= profXpToNext(level);
    level += 1;
  }
  return { level, xp: level >= PROF_K.PROF_MAX ? 0 : pool };
}

/**
 * Whether a use at `nowS` may grant experience, given when the ability last granted some
 * (`undefined` if it never has). Both times are in seconds on the same clock.
 */
export function canGainProfXp(lastGainS: number | undefined, nowS: number): boolean {
  return lastGainS === undefined || nowS - lastGainS >= PROF_K.PROF_USE_ICD_S;
}
