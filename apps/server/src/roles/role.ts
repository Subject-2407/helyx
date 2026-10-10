import type { ServerEnv } from '../config/env.js';
import type { ReadinessProbe } from '../http/readiness.js';
import type { Logger } from '../util/logger.js';

/** What every process role receives from the composition root. */
export interface RoleContext {
  readonly env: ServerEnv;
  readonly logger: Logger;
  readonly readiness: ReadinessProbe;
}

/** A started role. */
export interface RunningRole {
  stop(): Promise<void>;
}

export type RoleStarter = (context: RoleContext) => Promise<RunningRole>;

export type RoleName = ServerEnv['ROLE'];

/** One starter per role. Adding a role means adding an entry, not editing a branch. */
export type RoleRegistry = Readonly<Record<RoleName, RoleStarter>>;

export function selectRole(registry: RoleRegistry, name: RoleName): RoleStarter {
  return registry[name];
}
