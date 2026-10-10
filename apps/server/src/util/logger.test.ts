import { FakeClock } from '@helyx/shared';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

const NOW_MS = 1_767_225_600_000;

function captureLines(): { lines: Record<string, unknown>[]; write: (line: string) => void } {
  const lines: Record<string, unknown>[] = [];
  return { lines, write: (line) => lines.push(JSON.parse(line) as Record<string, unknown>) };
}

function testLogger(write: (line: string) => void) {
  return createLogger(
    { level: 'info', serverId: 'srv-1', role: 'game', clock: new FakeClock(NOW_MS) },
    { write },
  );
}

describe('createLogger', () => {
  it('writes JSON lines with the base fields and the injected time', () => {
    const { lines, write } = captureLines();
    testLogger(write).info('booted');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      msg: 'booted',
      serverId: 'srv-1',
      role: 'game',
      time: NOW_MS,
    });
  });

  it('redacts credential fields', () => {
    const { lines, write } = captureLines();
    testLogger(write).info(
      {
        account: { password: 'pw-1', token: 'tok-1', ticket: 'tic-1', secret: 'sec-1' },
        req: { headers: { cookie: 'c=1', authorization: 'Bearer abc' } },
      },
      'login',
    );
    const text = JSON.stringify(lines);
    for (const value of ['pw-1', 'tok-1', 'tic-1', 'sec-1', 'c=1', 'Bearer abc']) {
      expect(text).not.toContain(value);
    }
  });

  it('drops lines below the configured level', () => {
    const { lines, write } = captureLines();
    const logger = testLogger(write);
    logger.debug('hidden');
    logger.warn('shown');
    expect(lines.map((line) => line['msg'])).toEqual(['shown']);
  });
});
