/**
 * Every default value and allowed range for the server's environment variables, in one
 * place. Code elsewhere reads the parsed config; it never repeats these numbers.
 */
export const ENV_DEFAULTS = Object.freeze({
  NODE_ENV: 'development',
  ROLE: 'game',
  PORT: 2567,
  WORKER_HEALTH_PORT: 2568,
  DATABASE_POOL_MAX: 20,
  LOG_LEVEL: 'info',
  METRICS_ENABLED: true,
  AREA_CHANNEL_MAX: 80,
  PLACE_CHANNEL_MAX: 40,
  MAX_CHANNELS_PER_MAP: 10,
  MAX_CCU: 250,
  FLUSH_INTERVAL_S: 15,
  /** 2026-01-01T00:00:00Z, the origin of the in-game calendar. */
  CLOCK_EPOCH_MS: 1_767_225_600_000,
  SEASON_LENGTH_DAYS: 7,
  GUEST_PURGE_DAYS: 90,
  MAINTENANCE_MODE: false,
  RATE_LIMIT_SCALE: 1,
  /** Used for SERVER_ID when the host name is not known. */
  SERVER_ID: 'helyx-server',
} as const);

/**
 * Connection settings that match the local development services, so the server starts
 * without any configuration on a developer machine. Production must set every one of them.
 */
export const DEV_SERVICE_DEFAULTS = Object.freeze({
  DATABASE_URL: 'postgres://helyx:helyx@localhost:5432/helyx',
  REDIS_URL: 'redis://localhost:6379',
  BETTER_AUTH_SECRET: 'helyx-local-development-secret-not-for-production',
  PUBLIC_URL: 'http://localhost:5173',
} as const);

/** Ranges that a valid value must fall inside. */
export const ENV_BOUNDS = Object.freeze({
  portMin: 1,
  portMax: 65_535,
  authSecretMinLength: 32,
  flushIntervalMinS: 10,
  flushIntervalMaxS: 30,
});

export const NODE_ENVS = ['development', 'test', 'production'] as const;
export const SERVER_ROLES = ['game', 'worker'] as const;
export const LOG_LEVELS = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const;

/** Upper bound on how long a graceful stop may take before the process exits anyway. */
export const SHUTDOWN_GRACE_MS = 10_000;
