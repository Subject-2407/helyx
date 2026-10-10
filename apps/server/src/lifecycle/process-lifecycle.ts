import type { Logger } from 'pino';
import type { ShutdownState } from './shutdown-state.js';

const EXIT_OK = 0;
const EXIT_FAILURE = 1;
const STOP_SIGNALS = ['SIGINT', 'SIGTERM'] as const;
const FATAL_EVENTS = ['unhandledRejection', 'uncaughtException'] as const;

/** The parts of the Node process the lifecycle needs, so tests can stand in for it. */
export interface ProcessPort {
  on(event: string, listener: (reason: unknown) => void): unknown;
  exit(code: number): void;
}

export interface LifecycleDeps {
  readonly proc: ProcessPort;
  readonly logger: Pick<Logger, 'info' | 'warn' | 'error' | 'fatal'>;
  readonly state: ShutdownState;
  /** Closes servers and releases resources. */
  readonly stop: () => Promise<void>;
  /** Longest a stop may take before the process exits anyway. */
  readonly graceMs: number;
}

/**
 * Wires process signals and fatal errors to an orderly stop.
 * A stop signal marks the process not ready, stops it and exits cleanly. A fatal error is
 * logged, the same stop is attempted, and the process exits with a failure code so the
 * container runtime restarts it.
 */
export function installProcessLifecycle(deps: LifecycleDeps): void {
  const { proc, logger, state } = deps;

  const shutDown = async (exitCode: number): Promise<void> => {
    state.begin();
    const deadline = setTimeout(() => {
      logger.error({ graceMs: deps.graceMs }, 'graceful stop timed out');
      proc.exit(EXIT_FAILURE);
    }, deps.graceMs);
    deadline.unref();
    try {
      await deps.stop();
      logger.info('stopped');
      proc.exit(exitCode);
    } catch (error) {
      logger.error({ err: error }, 'graceful stop failed');
      proc.exit(EXIT_FAILURE);
    } finally {
      clearTimeout(deadline);
    }
  };

  for (const signal of STOP_SIGNALS) {
    proc.on(signal, () => {
      if (state.shuttingDown) {
        logger.warn({ signal }, 'already stopping');
        return;
      }
      logger.info({ signal }, 'stopping');
      void shutDown(EXIT_OK);
    });
  }

  for (const event of FATAL_EVENTS) {
    proc.on(event, (reason) => {
      logger.fatal({ err: reason, event }, 'fatal error');
      if (state.shuttingDown) proc.exit(EXIT_FAILURE);
      else void shutDown(EXIT_FAILURE);
    });
  }
}
