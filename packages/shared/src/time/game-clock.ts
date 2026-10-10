import { CLOCK_K, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE } from './clock-constants.js';

/** The four parts of a game day. */
export type GameDayPhase = 'dawn' | 'day' | 'dusk' | 'night';

/** Seasons in calendar order; a season's position in this list is its index. */
const SEASON_ORDER = ['spring', 'summer', 'autumn', 'winter'] as const;
export type GameSeason = (typeof SEASON_ORDER)[number];

/** World clock settings shared by every room and client. */
export interface GameClockConfig {
  /** Real epoch milliseconds at which the world clock reads day one, 00:00, spring. */
  epochMs: number;
  /**
   * Shift set by a game master to move the world clock. It moves both the time of day and the
   * real-day count that picks the season, so a shift of seven real days advances one season.
   */
  offsetMs: number;
  /** Real days each season lasts. */
  seasonLengthDays: number;
}

export interface GameTime {
  /** Game milliseconds since the clock epoch. */
  gameMs: number;
  hour: number;
  minute: number;
  phase: GameDayPhase;
  /** Real day within the current season, starting at 1. */
  dayOfSeason: number;
  season: GameSeason;
  /** Position of `season` in the calendar, 0 for spring to 3 for winter. */
  seasonIndex: number;
}

const GAME_DAY_IN_GAME_MS = CLOCK_K.GAME_DAY_MS * CLOCK_K.GAME_TIME_SCALE;

function requireNonNegative(label: string, value: number): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite non-negative number, got ${value}`);
  }
}

function validateConfig(config: GameClockConfig): void {
  requireNonNegative('Clock epoch', config.epochMs);
  if (!Number.isFinite(config.offsetMs)) {
    throw new RangeError(`Clock offset must be finite, got ${config.offsetMs}`);
  }
  if (!Number.isSafeInteger(config.seasonLengthDays) || config.seasonLengthDays < 1) {
    throw new RangeError(`Season length must be a positive whole number of days`);
  }
}

/** Day phase for a game hour in [0, 24). Night wraps across midnight. */
export function dayPhaseAt(hour: number): GameDayPhase {
  if (hour >= CLOCK_K.NIGHT_START_HOUR || hour < CLOCK_K.DAWN_START_HOUR) return 'night';
  if (hour < CLOCK_K.DAY_START_HOUR) return 'dawn';
  if (hour < CLOCK_K.DUSK_START_HOUR) return 'day';
  return 'dusk';
}

/**
 * Reads the world clock at a server time. Client and server both call this with their own
 * estimate of server time, so the clock never has to be streamed.
 */
export function gameTime(serverNowMs: number, config: GameClockConfig): GameTime {
  requireNonNegative('Server time', serverNowMs);
  validateConfig(config);
  const realElapsedMs = serverNowMs + config.offsetMs - config.epochMs;
  if (realElapsedMs < 0) {
    throw new RangeError(`The world clock does not run before its epoch`);
  }
  const gameMs = realElapsedMs * CLOCK_K.GAME_TIME_SCALE;
  const msIntoDay = gameMs % GAME_DAY_IN_GAME_MS;
  const hour = Math.floor(msIntoDay / MS_PER_HOUR);
  const minute = Math.floor((msIntoDay % MS_PER_HOUR) / MS_PER_MINUTE);
  const realDays = Math.floor(realElapsedMs / MS_PER_DAY);
  const seasonsElapsed = Math.floor(realDays / config.seasonLengthDays);
  const seasonIndex = seasonsElapsed % CLOCK_K.SEASON_COUNT;
  return {
    gameMs,
    hour,
    minute,
    phase: dayPhaseAt(hour),
    dayOfSeason: (realDays % config.seasonLengthDays) + 1,
    season: SEASON_ORDER[seasonIndex] ?? SEASON_ORDER[0],
    seasonIndex,
  };
}

/** Whole real UTC days since the unix epoch. Daily resets compare these, not game days. */
export function utcDayIndex(ms: number): number {
  requireNonNegative('Time', ms);
  return Math.floor(ms / MS_PER_DAY);
}
