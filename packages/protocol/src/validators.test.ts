import { describe, expect, it } from 'vitest';
import { C2S, C2S_CODES } from './codes.js';
import { CMD_ARG_SCHEMAS, CMD_OPS } from './commands.js';
import type { InputFrame, InputPacket } from './messages.js';
import { C2S_SAMPLES, CMD_ARG_SAMPLES, type SampleSet } from './testing/c2s-samples.js';
import { checkInputContext, parseC2S, parseCmd, viewTickWindow } from './validators.js';

function cases(samples: Readonly<Record<string, unknown>>): [string, unknown][] {
  return Object.entries(samples);
}

function sampleSetFor(code: C2S): SampleSet {
  const set = C2S_SAMPLES[code];
  if (set === undefined) {
    throw new Error(`no samples for message code ${code}`);
  }
  return set;
}

describe('sample coverage', () => {
  it('has a valid and an invalid sample for every client message code', () => {
    const numericCodes = Object.values(C2S).filter((code) => typeof code === 'number');
    expect([...C2S_CODES].sort()).toEqual([...numericCodes].sort());
    for (const code of C2S_CODES) {
      const set = C2S_SAMPLES[code];
      expect(set, `samples for code ${code}`).toBeDefined();
      expect(Object.keys(set?.valid ?? {}).length, `valid samples for ${code}`).toBeGreaterThan(0);
      expect(Object.keys(set?.invalid ?? {}).length, `invalid samples for ${code}`).toBeGreaterThan(
        0,
      );
    }
  });

  it('has a valid and an invalid argument sample for every registered command', () => {
    expect([...CMD_ARG_SCHEMAS.keys()].sort()).toEqual([...CMD_OPS].sort());
    for (const op of CMD_ARG_SCHEMAS.keys()) {
      const set = CMD_ARG_SAMPLES[op];
      expect(set, `samples for ${op}`).toBeDefined();
      expect(Object.keys(set?.valid ?? {}).length, `valid samples for ${op}`).toBeGreaterThan(0);
      expect(Object.keys(set?.invalid ?? {}).length, `invalid samples for ${op}`).toBeGreaterThan(
        0,
      );
    }
  });

  it('has no samples for commands that are not registered', () => {
    for (const op of Object.keys(CMD_ARG_SAMPLES)) {
      expect(CMD_ARG_SCHEMAS.has(op), op).toBe(true);
    }
  });
});

describe.each(C2S_CODES.map((code) => [C2S[code], code] as const))('%s messages', (_, code) => {
  const set = sampleSetFor(code);

  it.each(cases(set.valid))('accepts %s', (_name, payload) => {
    const result = parseC2S(code, payload);
    expect(result).toEqual({ ok: true, value: payload });
  });

  it.each(cases(set.invalid))('rejects %s', (_name, payload) => {
    const result = parseC2S(code, payload);
    expect(result.ok).toBe(false);
  });
});

describe.each(CMD_OPS.map((op) => [op] as const))('%s command', (op) => {
  const set = CMD_ARG_SAMPLES[op] ?? { valid: {}, invalid: {} };

  it.each(cases(set.valid))('accepts %s', (_name, args) => {
    const envelope = { rid: 7, op, a: args };
    expect(parseC2S(C2S.Cmd, envelope)).toEqual({ ok: true, value: envelope });
  });

  it.each(cases(set.invalid))('rejects %s', (_name, args) => {
    expect(parseC2S(C2S.Cmd, { rid: 7, op, a: args })).toEqual({
      ok: false,
      reason: 'invalid_args',
    });
  });
});

describe('rejection reasons', () => {
  it('rejects codes that do not exist', () => {
    for (const code of [0, 5, -1, 1.5, Number.NaN, 4000]) {
      expect(parseC2S(code, {})).toEqual({ ok: false, reason: 'unknown_code' });
    }
  });

  it('rejects ops without a registered schema, including object prototype names', () => {
    for (const op of ['inv.move', '__proto__', 'constructor', 'toString', '']) {
      expect(parseC2S(C2S.Cmd, { rid: 1, op, a: {} })).toEqual({
        ok: false,
        reason: 'unknown_op',
      });
    }
  });

  it('reports a malformed envelope separately from bad arguments', () => {
    expect(parseC2S(C2S.Cmd, { rid: -1, op: 'logout', a: {} })).toEqual({
      ok: false,
      reason: 'invalid_payload',
    });
    expect(parseC2S(C2S.Cmd, { rid: 1, op: 'logout', a: { x: 1 } })).toEqual({
      ok: false,
      reason: 'invalid_args',
    });
  });

  it('rejects a payload whose getter throws instead of throwing itself', () => {
    const hostile = {
      get f(): never {
        throw new Error('boom');
      },
      vt: 0,
    };
    expect(parseC2S(C2S.Input, hostile)).toEqual({ ok: false, reason: 'invalid_payload' });
  });

  it('rejects a revoked proxy', () => {
    const { proxy, revoke } = Proxy.revocable({}, {});
    revoke();
    for (const code of C2S_CODES) {
      expect(parseC2S(code, proxy).ok).toBe(false);
    }
  });

  it('dispatches commands through an injected registry', () => {
    const registry = new Map();
    expect(parseCmd({ rid: 1, op: 'logout', a: {} }, registry)).toEqual({
      ok: false,
      reason: 'unknown_op',
    });
  });
});

function packet(firstSeq: number, frames: number, vt: number): InputPacket {
  const f: InputFrame[] = Array.from({ length: frames }, (_, index) => [
    firstSeq + index,
    0,
    0,
    0,
    0,
  ]);
  return { f, vt };
}

describe('input packet against the connection', () => {
  const serverTick = 1_000;
  const inWindow = serverTick * 100;

  it('accepts any first seq before the first frame arrives', () => {
    expect(checkInputContext(packet(9_999, 2, inWindow), { lastSeq: null, serverTick })).toEqual({
      ok: true,
    });
  });

  it('accepts a packet that continues directly after the last frame', () => {
    expect(checkInputContext(packet(11, 3, inWindow), { lastSeq: 10, serverTick })).toEqual({
      ok: true,
    });
  });

  it('rejects a gap after the last frame', () => {
    expect(checkInputContext(packet(12, 1, inWindow), { lastSeq: 10, serverTick })).toEqual({
      ok: false,
      reason: 'seq_gap',
    });
  });

  it('rejects a repeated or older seq', () => {
    for (const firstSeq of [10, 9, 0]) {
      expect(checkInputContext(packet(firstSeq, 1, inWindow), { lastSeq: 10, serverTick })).toEqual(
        { ok: false, reason: 'seq_not_increasing' },
      );
    }
  });

  it('rejects a packet without frames', () => {
    expect(checkInputContext({ f: [], vt: inWindow }, { lastSeq: null, serverTick })).toEqual({
      ok: false,
      reason: 'no_frames',
    });
  });

  it('places the view tick window 40 ticks behind and 2 ticks ahead', () => {
    expect(viewTickWindow(serverTick)).toEqual({ min: 96_000, max: 100_200 });
  });

  it.each([
    ['oldest accepted view tick', 96_000, true],
    ['one step too old', 95_999, false],
    ['newest accepted view tick', 100_200, true],
    ['one step too new', 100_201, false],
  ])('%s', (_name, vt, accepted) => {
    const result = checkInputContext(packet(1, 1, vt), { lastSeq: null, serverTick });
    expect(result).toEqual(accepted ? { ok: true } : { ok: false, reason: 'vt_out_of_window' });
  });

  it('accepts a view tick of zero right after the room starts', () => {
    expect(checkInputContext(packet(1, 1, 0), { lastSeq: null, serverTick: 0 })).toEqual({
      ok: true,
    });
  });
});
