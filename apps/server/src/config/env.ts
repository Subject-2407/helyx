import { z } from 'zod';
import {
  DEV_SERVICE_DEFAULTS,
  ENV_BOUNDS,
  ENV_DEFAULTS,
  LOG_LEVELS,
  NODE_ENVS,
  SERVER_ROLES,
} from './env-defaults.js';

/** Raw environment, as found in `process.env`. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** Facts about the host that some defaults depend on, passed in so parsing stays pure. */
export interface EnvHostFacts {
  readonly hostname?: string;
}

export interface EnvIssue {
  readonly key: string;
  readonly message: string;
}

const port = z.coerce.number().int().min(ENV_BOUNDS.portMin).max(ENV_BOUNDS.portMax);
const positiveInt = z.coerce.number().int().positive();
const flag = z.stringbool();
const optionalText = z.string().min(1).optional();
const commaList = <T extends z.ZodType<unknown, string>>(item: T) =>
  z
    .string()
    .transform((text) =>
      text
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry !== ''),
    )
    .pipe(z.array(item));

const httpUrl = z.url({ protocol: /^https?$/u });
const postgresUrl = z.url({ protocol: /^postgres(ql)?$/u });
const redisUrl = z.url({ protocol: /^rediss?$/u });
const authSecret = z.string().min(ENV_BOUNDS.authSecretMinLength);

const envShape = {
  NODE_ENV: z.enum(NODE_ENVS).default(ENV_DEFAULTS.NODE_ENV),
  ROLE: z.enum(SERVER_ROLES).default(ENV_DEFAULTS.ROLE),
  SERVER_ID: z.string().min(1),
  PORT: port.default(ENV_DEFAULTS.PORT),
  WORKER_HEALTH_PORT: port.default(ENV_DEFAULTS.WORKER_HEALTH_PORT),
  PUBLIC_URL: httpUrl,
  DATABASE_URL: postgresUrl,
  DATABASE_POOL_MAX: positiveInt.default(ENV_DEFAULTS.DATABASE_POOL_MAX),
  REDIS_URL: redisUrl,
  BETTER_AUTH_SECRET: authSecret,
  BETTER_AUTH_URL: httpUrl.optional(),
  GOOGLE_CLIENT_ID: optionalText,
  GOOGLE_CLIENT_SECRET: optionalText,
  DISCORD_CLIENT_ID: optionalText,
  DISCORD_CLIENT_SECRET: optionalText,
  SMTP_URL: z.url({ protocol: /^smtps?$/u }).optional(),
  SMTP_FROM: z.email().optional(),
  CONTENT_BUNDLE_PATH: optionalText,
  LISTENER_BUNDLE_PATH: optionalText,
  LOG_LEVEL: z.enum(LOG_LEVELS).default(ENV_DEFAULTS.LOG_LEVEL),
  METRICS_ENABLED: flag.default(ENV_DEFAULTS.METRICS_ENABLED),
  AREA_CHANNEL_MAX: positiveInt.default(ENV_DEFAULTS.AREA_CHANNEL_MAX),
  PLACE_CHANNEL_MAX: positiveInt.default(ENV_DEFAULTS.PLACE_CHANNEL_MAX),
  MAX_CHANNELS_PER_MAP: positiveInt.default(ENV_DEFAULTS.MAX_CHANNELS_PER_MAP),
  MAX_CCU: positiveInt.default(ENV_DEFAULTS.MAX_CCU),
  FLUSH_INTERVAL_S: z.coerce
    .number()
    .int()
    .min(ENV_BOUNDS.flushIntervalMinS)
    .max(ENV_BOUNDS.flushIntervalMaxS)
    .default(ENV_DEFAULTS.FLUSH_INTERVAL_S),
  CLOCK_EPOCH_MS: z.coerce
    .number()
    .int()
    .min(0)
    .max(Number.MAX_SAFE_INTEGER)
    .default(ENV_DEFAULTS.CLOCK_EPOCH_MS),
  SEASON_LENGTH_DAYS: positiveInt.default(ENV_DEFAULTS.SEASON_LENGTH_DAYS),
  GUEST_PURGE_DAYS: positiveInt.default(ENV_DEFAULTS.GUEST_PURGE_DAYS),
  GM_BOOTSTRAP_EMAILS: commaList(z.email()).default([]),
  MAINTENANCE_MODE: flag.default(ENV_DEFAULTS.MAINTENANCE_MODE),
  RATE_LIMIT_SCALE: z.coerce.number().positive().default(ENV_DEFAULTS.RATE_LIMIT_SCALE),
};

const envSchema = z
  .object(envShape)
  .transform((env) => ({ ...env, BETTER_AUTH_URL: env.BETTER_AUTH_URL ?? env.PUBLIC_URL }));

/** The validated server configuration. */
export type ServerEnv = z.output<typeof envSchema>;

/** Every environment variable the server reads. */
export const ENV_KEYS: readonly string[] = Object.freeze(Object.keys(envShape));

type ServiceKey = keyof typeof DEV_SERVICE_DEFAULTS;
const SERVICE_KEYS = Object.keys(DEV_SERVICE_DEFAULTS) as ServiceKey[];

/** Modes in which missing connection settings fall back to the local development services. */
const LENIENT_MODES: ReadonlySet<string> = new Set(['development', 'test']);

/** Keys whose values may hold credentials; their values never appear in error text. */
const SENSITIVE_KEY = /SECRET|PASSWORD|TOKEN|_URL$/u;

/** Thrown when the environment is invalid. Lists every problem and never echoes a secret. */
export class EnvValidationError extends Error {
  readonly issues: readonly EnvIssue[];

  constructor(issues: readonly EnvIssue[], sensitiveValues: readonly string[]) {
    const lines = issues.map((issue) => `  - ${issue.key}: ${issue.message}`);
    super(redact(`Invalid server environment:\n${lines.join('\n')}`, sensitiveValues));
    this.name = 'EnvValidationError';
    this.issues = issues.map((issue) => ({
      key: issue.key,
      message: redact(issue.message, sensitiveValues),
    }));
  }
}

function redact(text: string, values: readonly string[]): string {
  return values.reduce((result, value) => result.split(value).join('[redacted]'), text);
}

/** Drops empty values: an `.env` line like `KEY=` means "not set". */
function withoutEmptyValues(source: EnvSource): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && value !== '') result[key] = value;
  }
  return result;
}

function productionIssues(values: Record<string, string>): EnvIssue[] {
  const issues: EnvIssue[] = SERVICE_KEYS.filter((key) => values[key] === undefined).map((key) => ({
    key,
    message: 'is required in production',
  }));
  if (values['BETTER_AUTH_SECRET'] === DEV_SERVICE_DEFAULTS.BETTER_AUTH_SECRET) {
    issues.push({
      key: 'BETTER_AUTH_SECRET',
      message: 'must not use the development value in production',
    });
  }
  return issues;
}

/**
 * Validates the environment and returns the typed configuration. Pure: it reads only its
 * arguments. Outside production, missing connection settings fall back to the local
 * development services; in production they are required.
 *
 * @throws EnvValidationError listing every invalid or missing variable
 */
export function parseEnv(source: EnvSource, host: EnvHostFacts = {}): ServerEnv {
  const given = withoutEmptyValues(source);
  // An unrecognized NODE_ENV is treated as production so no development fallback can slip in.
  const strict = !LENIENT_MODES.has(given['NODE_ENV'] ?? ENV_DEFAULTS.NODE_ENV);
  const values = {
    SERVER_ID: host.hostname ?? ENV_DEFAULTS.SERVER_ID,
    ...(strict ? {} : DEV_SERVICE_DEFAULTS),
    ...given,
  };
  const manual = strict ? productionIssues(given) : [];
  const reported = new Set(manual.map((issue) => issue.key));
  const result = envSchema.safeParse(values);
  const parsed: EnvIssue[] = result.success
    ? []
    : result.error.issues
        .map((issue) => ({ key: String(issue.path[0] ?? 'environment'), message: issue.message }))
        .filter((issue) => !reported.has(issue.key));
  const issues = [...manual, ...parsed];
  if (issues.length > 0 || !result.success) {
    const sensitive = Object.entries(given)
      .filter(([key]) => SENSITIVE_KEY.test(key))
      .map(([, value]) => value);
    throw new EnvValidationError(issues, sensitive);
  }
  return result.data;
}
