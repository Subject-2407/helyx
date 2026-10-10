/** The four parts of a game day. */
export const DAY_PHASES = Object.freeze(['dawn', 'day', 'dusk', 'night'] as const);

export type DayPhase = (typeof DAY_PHASES)[number];

/** Seasons in calendar order; a season's position here is its index. */
export const SEASONS = Object.freeze(['spring', 'summer', 'autumn', 'winter'] as const);

export type Season = (typeof SEASONS)[number];

export const WEATHER_KINDS = Object.freeze([
  'clear',
  'rain',
  'fog',
  'storm',
  'snow',
  'ash_wind',
] as const);

export type WeatherKind = (typeof WEATHER_KINDS)[number];

/** How a zone treats player combat. */
export const PVP_TIERS = Object.freeze(['safe', 'contested', 'lawless'] as const);

export type PvpTier = (typeof PVP_TIERS)[number];

/** A character's standing in player combat. */
export const PVP_FLAGS = Object.freeze(['innocent', 'aggressor', 'outlaw'] as const);

export type PvpFlag = (typeof PVP_FLAGS)[number];
