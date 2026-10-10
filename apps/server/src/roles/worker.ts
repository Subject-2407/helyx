import { createHttpApp } from '../http/app.js';
import { listen } from '../http/server.js';
import type { RoleContext, RunningRole } from './role.js';

/** The background worker: for now only a health endpoint, so the runtime can watch it. */
export async function startWorkerRole(context: RoleContext): Promise<RunningRole> {
  const app = createHttpApp({ readiness: context.readiness });
  const server = await listen(app, context.env.WORKER_HEALTH_PORT);
  context.logger.info({ port: server.port }, 'worker health endpoint listening');
  return { stop: () => server.close() };
}
