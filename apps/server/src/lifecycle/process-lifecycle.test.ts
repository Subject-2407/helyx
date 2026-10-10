import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import { installProcessLifecycle } from './process-lifecycle.js';
import { ShutdownState } from './shutdown-state.js';

const GRACE_MS = 50;
const never = () => new Promise<void>(() => undefined);

function harness(stop: () => Promise<void> = () => Promise.resolve()) {
  const emitter = new EventEmitter();
  const exits: number[] = [];
  let signalExit: () => void = () => undefined;
  const exited = new Promise<void>((resolve) => {
    signalExit = resolve;
  });
  const proc = {
    on: (event: string, listener: (reason: unknown) => void) => emitter.on(event, listener),
    exit: (code: number) => {
      exits.push(code);
      signalExit();
    },
  };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), fatal: vi.fn() };
  const state = new ShutdownState();
  const stopSpy = vi.fn(stop);
  installProcessLifecycle({ proc, logger, state, stop: stopSpy, graceMs: GRACE_MS });
  return { emitter, exits, exited, logger, state, stopSpy };
}

describe('process lifecycle', () => {
  it.each(['SIGINT', 'SIGTERM'])('%s marks not ready, stops and exits cleanly', async (signal) => {
    const h = harness();
    h.emitter.emit(signal);
    expect(h.state.shuttingDown).toBe(true);
    await h.exited;
    expect(h.stopSpy).toHaveBeenCalledTimes(1);
    expect(h.exits).toEqual([0]);
  });

  it('is already not ready while the servers close', async () => {
    let readyWhileStopping: boolean | undefined;
    const h = harness();
    h.stopSpy.mockImplementation(async () => {
      readyWhileStopping = await h.state.readinessCheck().isReady();
    });
    h.emitter.emit('SIGTERM');
    await h.exited;
    expect(readyWhileStopping).toBe(false);
  });

  it('ignores a second stop signal', async () => {
    const h = harness();
    h.emitter.emit('SIGTERM');
    h.emitter.emit('SIGINT');
    await h.exited;
    expect(h.stopSpy).toHaveBeenCalledTimes(1);
    expect(h.exits).toEqual([0]);
  });

  it('exits with failure when stopping fails', async () => {
    const h = harness(() => Promise.reject(new Error('close failed')));
    h.emitter.emit('SIGTERM');
    await h.exited;
    expect(h.exits).toEqual([1]);
    expect(h.logger.error).toHaveBeenCalled();
  });

  it('exits with failure when stopping takes too long', async () => {
    const h = harness(never);
    h.emitter.emit('SIGTERM');
    await h.exited;
    expect(h.exits).toEqual([1]);
  });

  it.each(['uncaughtException', 'unhandledRejection'])(
    '%s is logged as fatal and exits with failure',
    async (event) => {
      const h = harness();
      h.emitter.emit(event, new Error('boom'));
      await h.exited;
      expect(h.logger.fatal).toHaveBeenCalledTimes(1);
      expect(h.state.shuttingDown).toBe(true);
      expect(h.stopSpy).toHaveBeenCalledTimes(1);
      expect(h.exits).toEqual([1]);
    },
  );

  it('exits at once on a fatal error during shutdown', async () => {
    const h = harness(never);
    h.emitter.emit('SIGTERM');
    h.emitter.emit('uncaughtException', new Error('boom'));
    await h.exited;
    expect(h.exits).toEqual([1]);
  });
});

describe('ShutdownState', () => {
  it('starts ready and stays not ready once shutdown begins', async () => {
    const state = new ShutdownState();
    const check = state.readinessCheck();
    expect(state.shuttingDown).toBe(false);
    expect(await check.isReady()).toBe(true);
    state.begin();
    expect(state.shuttingDown).toBe(true);
    expect(await check.isReady()).toBe(false);
  });
});
