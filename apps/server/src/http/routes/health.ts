import { Router } from 'express';
import type { ReadinessProbe } from '../readiness.js';

const HTTP_OK = 200;
const HTTP_UNAVAILABLE = 503;

/**
 * Liveness and readiness endpoints for the container runtime and the reverse proxy.
 * `/healthz` only says the process is alive; `/readyz` says it can take traffic.
 */
export function healthRoutes(readiness: ReadinessProbe): Router {
  const router = Router();

  router.get('/healthz', (_req, res) => {
    res.status(HTTP_OK).json({ status: 'ok' });
  });

  router.get('/readyz', (_req, res, next) => {
    readiness
      .evaluate()
      .then((report) => {
        res.set('Cache-Control', 'no-store');
        if (report.ready) res.status(HTTP_OK).json({ status: 'ready' });
        else res.status(HTTP_UNAVAILABLE).json({ status: 'not_ready' });
      })
      .catch(next);
  });

  return router;
}
