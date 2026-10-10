import express, { type Express } from 'express';
import type { ReadinessProbe } from './readiness.js';
import { healthRoutes } from './routes/health.js';

export interface HttpAppDeps {
  readonly readiness: ReadinessProbe;
}

/** The HTTP application. Later routes (auth, API) are mounted here as they arrive. */
export function createHttpApp(deps: HttpAppDeps): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(healthRoutes(deps.readiness));
  return app;
}
