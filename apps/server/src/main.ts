import { bootstrap } from './config/bootstrap.js';
import { SHUTDOWN_GRACE_MS } from './config/env-defaults.js';
import { readinessFrom } from './http/readiness.js';
import { installProcessLifecycle } from './lifecycle/process-lifecycle.js';
import { ShutdownState } from './lifecycle/shutdown-state.js';
import { ROLES } from './roles/registry.js';
import { selectRole, type RunningRole } from './roles/role.js';

// Composition root: the only place that builds infrastructure and wires it together.
// The repository's .env sits three levels up from both src/main.ts and dist/main.js.
const { env, logger } = bootstrap(new URL('../../../.env', import.meta.url));

const shutdownState = new ShutdownState();
const readiness = readinessFrom([shutdownState.readinessCheck()]);
// Filled once the role has started, so a stop signal during start-up has nothing to close.
const running: RunningRole[] = [];

installProcessLifecycle({
  proc: process,
  logger,
  state: shutdownState,
  graceMs: SHUTDOWN_GRACE_MS,
  stop: async () => {
    await Promise.all(running.map((role) => role.stop()));
  },
});

logger.info({ nodeEnv: env.NODE_ENV }, 'starting');
running.push(await selectRole(ROLES, env.ROLE)({ env, logger, readiness }));
