import { startGameRole } from './game.js';
import type { RoleRegistry } from './role.js';
import { startWorkerRole } from './worker.js';

/** Every role this server binary can run, keyed by the ROLE setting. */
export const ROLES: RoleRegistry = Object.freeze({
  game: startGameRole,
  worker: startWorkerRole,
});
