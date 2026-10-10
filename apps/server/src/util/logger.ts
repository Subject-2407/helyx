import type { Clock } from '@helyx/shared';
import { pino, type DestinationStream, type Level, type Logger } from 'pino';

export type { Logger } from 'pino';

/** Fields that can carry credentials; pino replaces their values before a line is written. */
export const LOG_REDACT_PATHS: readonly string[] = Object.freeze([
  '*.password',
  '*.token',
  '*.ticket',
  '*.secret',
  'req.headers.cookie',
  'req.headers.authorization',
]);

export interface LoggerOptions {
  readonly level: Level;
  readonly serverId: string;
  readonly role: string;
  readonly clock: Clock;
  /**
   * Module path of a human-readable formatter. Development only; when absent the logger
   * writes one JSON object per line, which is what production log collection expects.
   */
  readonly prettyTarget?: string | undefined;
}

/**
 * Builds the process logger. Every line carries the server id and role, and timestamps
 * come from the injected clock.
 *
 * @param destination where JSON lines go (stdout when omitted); ignored with a pretty target
 */
export function createLogger(options: LoggerOptions, destination?: DestinationStream): Logger {
  const config = {
    level: options.level,
    base: { serverId: options.serverId, role: options.role },
    redact: [...LOG_REDACT_PATHS],
    timestamp: () => `,"time":${options.clock.now()}`,
  };
  if (options.prettyTarget !== undefined) {
    return pino({ ...config, transport: { target: options.prettyTarget } });
  }
  return destination === undefined ? pino(config) : pino(config, destination);
}
