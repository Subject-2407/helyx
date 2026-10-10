import { hostname } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SystemClock } from '../util/clock.js';
import { createLogger, type Logger } from '../util/logger.js';
import { EnvValidationError, parseEnv, type ServerEnv } from './env.js';
import { loadEnvFiles } from './env-files.js';

const EXIT_INVALID_CONFIG = 1;

export interface Bootstrapped {
  readonly env: ServerEnv;
  readonly clock: SystemClock;
  readonly logger: Logger;
}

/** Finds the human-readable log formatter if it is installed (it is a development tool). */
function prettyTransportTarget(): string | undefined {
  try {
    return fileURLToPath(import.meta.resolve('pino-pretty'));
  } catch {
    return undefined;
  }
}

function readEnv(): ServerEnv {
  try {
    return parseEnv(process.env, { hostname: hostname() });
  } catch (error) {
    if (!(error instanceof EnvValidationError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return process.exit(EXIT_INVALID_CONFIG);
  }
}

/**
 * Shared start-up for the process entry points: loads `.env` files, validates the
 * environment (exiting on error), and builds the clock and logger.
 *
 * @param repoEnvFile the repository's `.env`, located by the calling entry point
 */
export function bootstrap(repoEnvFile: URL): Bootstrapped {
  loadEnvFiles([resolve(process.cwd(), '.env'), fileURLToPath(repoEnvFile)]);
  const env = readEnv();
  const clock = new SystemClock();
  const logger = createLogger({
    level: env.LOG_LEVEL,
    serverId: env.SERVER_ID,
    role: env.ROLE,
    clock,
    prettyTarget: env.NODE_ENV === 'development' ? prettyTransportTarget() : undefined,
  });
  return { env, clock, logger };
}
