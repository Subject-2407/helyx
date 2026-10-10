import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DEV_SERVICE_DEFAULTS, ENV_DEFAULTS } from './env-defaults.js';
import { ENV_KEYS, EnvValidationError, parseEnv } from './env.js';

const PRODUCTION_SECRETS = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://helyx:prod-db-password-123@postgres:5432/helyx',
  REDIS_URL: 'redis://redis:6379',
  BETTER_AUTH_SECRET: 'a-production-secret-that-is-long-enough-0123',
  PUBLIC_URL: 'https://helyx.example',
} as const;

function errorOf(run: () => unknown): EnvValidationError {
  try {
    run();
  } catch (error) {
    if (error instanceof EnvValidationError) return error;
    throw error;
  }
  throw new Error('expected parseEnv to throw');
}

describe('parseEnv defaults', () => {
  it('applies every documented default to an empty environment', () => {
    const env = parseEnv({}, { hostname: 'box-1' });
    expect(env.NODE_ENV).toBe('development');
    expect(env.ROLE).toBe('game');
    expect(env.PORT).toBe(2567);
    expect(env.WORKER_HEALTH_PORT).toBe(2568);
    expect(env.SERVER_ID).toBe('box-1');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.DATABASE_POOL_MAX).toBe(20);
    expect(env.METRICS_ENABLED).toBe(true);
    expect(env.AREA_CHANNEL_MAX).toBe(80);
    expect(env.PLACE_CHANNEL_MAX).toBe(40);
    expect(env.MAX_CHANNELS_PER_MAP).toBe(10);
    expect(env.MAX_CCU).toBe(250);
    expect(env.FLUSH_INTERVAL_S).toBe(15);
    expect(env.CLOCK_EPOCH_MS).toBe(1_767_225_600_000);
    expect(new Date(env.CLOCK_EPOCH_MS).toISOString()).toBe('2026-01-01T00:00:00.000Z');
    expect(env.SEASON_LENGTH_DAYS).toBe(7);
    expect(env.GUEST_PURGE_DAYS).toBe(90);
    expect(env.MAINTENANCE_MODE).toBe(false);
    expect(env.RATE_LIMIT_SCALE).toBe(1);
    expect(env.GM_BOOTSTRAP_EMAILS).toEqual([]);
  });

  it('falls back to the local development services outside production', () => {
    const env = parseEnv({});
    expect(env.DATABASE_URL).toBe(DEV_SERVICE_DEFAULTS.DATABASE_URL);
    expect(env.REDIS_URL).toBe(DEV_SERVICE_DEFAULTS.REDIS_URL);
    expect(env.BETTER_AUTH_SECRET).toBe(DEV_SERVICE_DEFAULTS.BETTER_AUTH_SECRET);
    expect(env.PUBLIC_URL).toBe(DEV_SERVICE_DEFAULTS.PUBLIC_URL);
    expect(env.BETTER_AUTH_URL).toBe(DEV_SERVICE_DEFAULTS.PUBLIC_URL);
    expect(env.SERVER_ID).toBe(ENV_DEFAULTS.SERVER_ID);
  });

  it('treats empty values as unset', () => {
    const env = parseEnv({ PORT: '', GOOGLE_CLIENT_ID: '', SMTP_URL: '', GM_BOOTSTRAP_EMAILS: '' });
    expect(env.PORT).toBe(2567);
    expect(env.GOOGLE_CLIENT_ID).toBeUndefined();
    expect(env.SMTP_URL).toBeUndefined();
    expect(env.GM_BOOTSTRAP_EMAILS).toEqual([]);
  });

  it('uses the public URL for the auth URL unless one is given', () => {
    expect(parseEnv({ PUBLIC_URL: 'https://a.example' }).BETTER_AUTH_URL).toBe('https://a.example');
    const env = parseEnv({ PUBLIC_URL: 'https://a.example', BETTER_AUTH_URL: 'https://b.example' });
    expect(env.BETTER_AUTH_URL).toBe('https://b.example');
  });
});

describe('parseEnv coercion', () => {
  it('turns numeric strings into numbers', () => {
    const env = parseEnv({
      PORT: '3000',
      WORKER_HEALTH_PORT: '3001',
      DATABASE_POOL_MAX: '5',
      MAX_CCU: '12',
      FLUSH_INTERVAL_S: '30',
      CLOCK_EPOCH_MS: '0',
      RATE_LIMIT_SCALE: '2.5',
    });
    expect(env.PORT).toBe(3000);
    expect(env.WORKER_HEALTH_PORT).toBe(3001);
    expect(env.DATABASE_POOL_MAX).toBe(5);
    expect(env.MAX_CCU).toBe(12);
    expect(env.FLUSH_INTERVAL_S).toBe(30);
    expect(env.CLOCK_EPOCH_MS).toBe(0);
    expect(env.RATE_LIMIT_SCALE).toBe(2.5);
  });

  it('turns flag strings into booleans', () => {
    expect(parseEnv({ METRICS_ENABLED: 'false', MAINTENANCE_MODE: 'true' })).toMatchObject({
      METRICS_ENABLED: false,
      MAINTENANCE_MODE: true,
    });
    expect(parseEnv({ METRICS_ENABLED: '0', MAINTENANCE_MODE: '1' })).toMatchObject({
      METRICS_ENABLED: false,
      MAINTENANCE_MODE: true,
    });
  });

  it('rejects flags that are not booleans', () => {
    expect(() => parseEnv({ MAINTENANCE_MODE: 'maybe' })).toThrow(/MAINTENANCE_MODE/);
  });

  it('splits comma lists and trims the entries', () => {
    const env = parseEnv({ GM_BOOTSTRAP_EMAILS: ' a@helyx.example, b@helyx.example ,, ' });
    expect(env.GM_BOOTSTRAP_EMAILS).toEqual(['a@helyx.example', 'b@helyx.example']);
  });

  it('rejects comma lists with invalid entries', () => {
    expect(() => parseEnv({ GM_BOOTSTRAP_EMAILS: 'a@helyx.example,nope' })).toThrow(
      /GM_BOOTSTRAP_EMAILS/,
    );
  });
});

describe('parseEnv validation', () => {
  it.each(['abc', '0', '-1', '65536', '25.5'])('rejects PORT=%s', (port) => {
    const error = errorOf(() => parseEnv({ PORT: port }));
    expect(error.issues.map((issue) => issue.key)).toEqual(['PORT']);
  });

  it('rejects an unknown role and log level', () => {
    const error = errorOf(() => parseEnv({ ROLE: 'boss', LOG_LEVEL: 'loud' }));
    expect(error.issues.map((issue) => issue.key).sort()).toEqual(['LOG_LEVEL', 'ROLE']);
  });

  it('rejects a flush interval outside its range', () => {
    expect(() => parseEnv({ FLUSH_INTERVAL_S: '9' })).toThrow(/FLUSH_INTERVAL_S/);
    expect(() => parseEnv({ FLUSH_INTERVAL_S: '31' })).toThrow(/FLUSH_INTERVAL_S/);
  });

  it('reports every problem in one error', () => {
    const error = errorOf(() => parseEnv({ PORT: 'x', WORKER_HEALTH_PORT: 'y', MAX_CCU: '-3' }));
    expect(error.issues.map((issue) => issue.key).sort()).toEqual([
      'MAX_CCU',
      'PORT',
      'WORKER_HEALTH_PORT',
    ]);
    expect(error.message).toMatch(/PORT/);
    expect(error.message).toMatch(/MAX_CCU/);
  });
});

describe('parseEnv in production', () => {
  it('accepts a complete production environment', () => {
    const env = parseEnv(PRODUCTION_SECRETS);
    expect(env.NODE_ENV).toBe('production');
    expect(env.DATABASE_URL).toBe(PRODUCTION_SECRETS.DATABASE_URL);
  });

  it('requires the connection settings and the auth secret', () => {
    const error = errorOf(() => parseEnv({ NODE_ENV: 'production' }));
    expect(error.issues.map((issue) => issue.key).sort()).toEqual([
      'BETTER_AUTH_SECRET',
      'DATABASE_URL',
      'PUBLIC_URL',
      'REDIS_URL',
    ]);
  });

  it('rejects an auth secret shorter than 32 characters', () => {
    const error = errorOf(() =>
      parseEnv({ ...PRODUCTION_SECRETS, BETTER_AUTH_SECRET: 'short-secret' }),
    );
    expect(error.issues.map((issue) => issue.key)).toEqual(['BETTER_AUTH_SECRET']);
  });

  it('rejects the development auth secret', () => {
    const error = errorOf(() =>
      parseEnv({
        ...PRODUCTION_SECRETS,
        BETTER_AUTH_SECRET: DEV_SERVICE_DEFAULTS.BETTER_AUTH_SECRET,
      }),
    );
    expect(error.issues.map((issue) => issue.key)).toEqual(['BETTER_AUTH_SECRET']);
  });

  it('rejects connection URLs with the wrong scheme', () => {
    const error = errorOf(() =>
      parseEnv({ ...PRODUCTION_SECRETS, DATABASE_URL: 'mysql://x@y/z', REDIS_URL: 'http://r' }),
    );
    expect(error.issues.map((issue) => issue.key).sort()).toEqual(['DATABASE_URL', 'REDIS_URL']);
  });
});

describe('parseEnv error text', () => {
  it('never contains secret values', () => {
    const secrets = {
      BETTER_AUTH_SECRET: 'tiny-secret-value',
      DATABASE_URL: 'mysql://admin:hunter2-db-password@db/x',
      REDIS_URL: 'ftp://user:redis-password-77@cache',
      GOOGLE_CLIENT_SECRET: 'google-secret-xyz',
      SMTP_URL: 'not a url smtp-password-55',
    };
    const error = errorOf(() =>
      parseEnv({ NODE_ENV: 'production', PUBLIC_URL: 'nope', PORT: 'zzz', ...secrets }),
    );
    const text = `${error.message}\n${JSON.stringify(error.issues)}\n${String(error.stack)}`;
    for (const value of Object.values(secrets)) {
      expect(text).not.toContain(value);
    }
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('redis-password-77');
    expect(text).not.toContain('smtp-password-55');
    expect(error.cause).toBeUndefined();
  });
});

describe('env example file', () => {
  it('lists every variable the server reads', () => {
    const example = readFileSync(new URL('../../../../.env.example', import.meta.url), 'utf8');
    const listed = new Set(
      example
        .split(/\r?\n/u)
        .map((line) => /^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/u.exec(line)?.[1])
        .filter((key): key is string => key !== undefined),
    );
    const missing = ENV_KEYS.filter((key) => !listed.has(key));
    expect(missing).toEqual([]);
  });
});
