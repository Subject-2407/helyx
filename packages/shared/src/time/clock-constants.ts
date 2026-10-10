/**
 * Numbers the game clock is built from. One real second is thirty game seconds, so a game day
 * lasts 48 real minutes, and the four day phases start at fixed game hours.
 *
 * These are the clock's only tunable values. They belong with the other balance constants and
 * move there once that table exists; nothing outside the time folder should import this file.
 */
export const CLOCK_K = Object.freeze({
  /** Game milliseconds that pass per real millisecond. */
  GAME_TIME_SCALE: 30,
  /** Real milliseconds in one game day (48 real minutes). */
  GAME_DAY_MS: 2_880_000,
  /** Game hour at which each day phase begins. */
  DAWN_START_HOUR: 5,
  DAY_START_HOUR: 7,
  DUSK_START_HOUR: 18,
  NIGHT_START_HOUR: 20,
  /** Seasons in one year of the world. */
  SEASON_COUNT: 4,
} as const);

/** Calendar facts that are not tuning: a day, an hour and a minute in milliseconds. */
export const MS_PER_DAY = 86_400_000;
export const MS_PER_HOUR = 3_600_000;
export const MS_PER_MINUTE = 60_000;
