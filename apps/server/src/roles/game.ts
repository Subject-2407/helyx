import { createHttpApp } from '../http/app.js';
import { listen } from '../http/server.js';
import type { RoleContext, RunningRole } from './role.js';

/** The game process: serves HTTP on the public port. Game rooms join it in later work. */
export async function startGameRole(context: RoleContext): Promise<RunningRole> {
  const app = createHttpApp({ readiness: context.readiness });
  const server = await listen(app, context.env.PORT);
  context.logger.info({ port: server.port }, 'game server listening');
  return { stop: () => server.close() };
}
