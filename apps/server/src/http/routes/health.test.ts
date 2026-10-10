import { afterEach, describe, expect, it } from 'vitest';
import { ShutdownState } from '../../lifecycle/shutdown-state.js';
import { createHttpApp } from '../app.js';
import { readinessFrom, type ReadinessCheck } from '../readiness.js';
import { listen, type RunningHttpServer } from '../server.js';

const EPHEMERAL_PORT = 0;
const servers: RunningHttpServer[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

async function serve(checks: readonly ReadinessCheck[]): Promise<string> {
  const server = await listen(createHttpApp({ readiness: readinessFrom(checks) }), EPHEMERAL_PORT);
  servers.push(server);
  return `http://127.0.0.1:${server.port}`;
}

describe('health routes', () => {
  it('answers /healthz with ok', async () => {
    const base = await serve([]);
    const response = await fetch(`${base}/healthz`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('is ready until shutdown begins, then not ready', async () => {
    const state = new ShutdownState();
    const base = await serve([state.readinessCheck()]);

    const before = await fetch(`${base}/readyz`);
    expect(before.status).toBe(200);
    expect(await before.json()).toEqual({ status: 'ready' });

    state.begin();
    const after = await fetch(`${base}/readyz`);
    expect(after.status).toBe(503);
    expect(await after.json()).toEqual({ status: 'not_ready' });

    const alive = await fetch(`${base}/healthz`);
    expect(alive.status).toBe(200);
  });

  it('is not ready when any check fails', async () => {
    const base = await serve([
      new ShutdownState().readinessCheck(),
      { name: 'database', isReady: () => Promise.resolve(false) },
    ]);
    expect((await fetch(`${base}/readyz`)).status).toBe(503);
  });

  it('is not ready when a check throws', async () => {
    const base = await serve([
      {
        name: 'cache',
        isReady: () => {
          throw new Error('unreachable');
        },
      },
    ]);
    expect((await fetch(`${base}/readyz`)).status).toBe(503);
  });

  it('does not advertise the framework', async () => {
    const base = await serve([]);
    expect((await fetch(`${base}/healthz`)).headers.get('x-powered-by')).toBeNull();
  });
});

describe('readinessFrom', () => {
  it('names the failing checks', async () => {
    const report = await readinessFrom([
      { name: 'a', isReady: () => true },
      { name: 'b', isReady: () => false },
      { name: 'c', isReady: () => Promise.reject(new Error('down')) },
    ]).evaluate();
    expect(report).toEqual({ ready: false, failing: ['b', 'c'] });
  });

  it('is ready with no checks', async () => {
    expect(await readinessFrom([]).evaluate()).toEqual({ ready: true, failing: [] });
  });
});
