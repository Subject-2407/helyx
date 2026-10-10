import { pino } from 'pino';
import { describe, expect, it } from 'vitest';
import { parseEnv } from '../config/env.js';
import { readinessFrom } from '../http/readiness.js';
import { listen } from '../http/server.js';
import { startGameRole } from './game.js';
import { ROLES } from './registry.js';
import { selectRole, type RoleContext, type RoleRegistry, type RunningRole } from './role.js';
import { startWorkerRole } from './worker.js';

const EPHEMERAL_PORT = 0;

function testContext(): RoleContext {
  const env = { ...parseEnv({}), PORT: EPHEMERAL_PORT, WORKER_HEALTH_PORT: EPHEMERAL_PORT };
  return { env, logger: pino({ level: 'silent' }), readiness: readinessFrom([]) };
}

/** Asks the OS for a port that is free right now. */
async function freePort(): Promise<number> {
  const probe = await listen(() => undefined, EPHEMERAL_PORT);
  await probe.close();
  return probe.port;
}

describe('role registry', () => {
  it('maps each role name to its starter', () => {
    expect(selectRole(ROLES, 'game')).toBe(startGameRole);
    expect(selectRole(ROLES, 'worker')).toBe(startWorkerRole);
  });

  it('starts only the selected role', async () => {
    const started: string[] = [];
    const running: RunningRole = { stop: () => Promise.resolve() };
    const starter = (name: string) => () => {
      started.push(name);
      return Promise.resolve(running);
    };
    const registry: RoleRegistry = { game: starter('game'), worker: starter('worker') };

    await selectRole(registry, 'worker')(testContext());
    expect(started).toEqual(['worker']);
  });

  it.each([
    ['game', 'PORT'],
    ['worker', 'WORKER_HEALTH_PORT'],
  ] as const)('the %s role serves health checks on %s', async (name, portKey) => {
    const port = await freePort();
    const ctx = testContext();
    const role = await selectRole(ROLES, name)({ ...ctx, env: { ...ctx.env, [portKey]: port } });
    try {
      const response = await fetch(`http://127.0.0.1:${port}/healthz`);
      expect(response.status).toBe(200);
    } finally {
      await role.stop();
    }
  });
});
