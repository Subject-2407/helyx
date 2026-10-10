import type { Rng } from '@helyx/shared';
import { describe, expect, it } from 'vitest';
import { C2S, C2S_CODES } from './codes.js';
import { CMD_OPS } from './commands.js';
import { C2S_SAMPLES } from './testing/c2s-samples.js';
import { PROTOCOL_TEST_SEED, createTestRng, pickOne, randomInt } from './testing/sfc32.js';
import { parseC2S } from './validators.js';

// Random and mutated payloads for every client message code. Whatever arrives, parsing must
// answer with a result and never throw.

const PAYLOADS_PER_CODE = 1_000;
const MAX_DEPTH = 3;

const AWKWARD_NUMBERS = [
  0,
  -0,
  1,
  -1,
  0.5,
  2 ** 15,
  2 ** 16,
  2 ** 32,
  2 ** 53,
  Number.MAX_VALUE,
  Number.MIN_VALUE,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];
const AWKWARD_STRINGS = [
  '',
  'logout',
  'chat.send',
  '__proto__',
  'constructor',
  '\u0000',
  '\u{1F600}',
];
const AWKWARD_KEYS = ['f', 'vt', 'c', 'rid', 'op', 'a', 'ch', 'text', 'to', 'channel', '__proto__'];

function randomString(rng: Rng): string {
  if (rng.next() < 0.5) {
    return pickOne(rng, AWKWARD_STRINGS);
  }
  const length = randomInt(rng, 0, 40);
  return Array.from({ length }, () => String.fromCharCode(randomInt(rng, 0, 0xffff))).join('');
}

function randomLeaf(rng: Rng): unknown {
  const kinds: (() => unknown)[] = [
    () => null,
    () => undefined,
    () => rng.next() < 0.5,
    () => pickOne(rng, AWKWARD_NUMBERS),
    () => randomInt(rng, -1_000, 70_000),
    () => rng.next() * 1e6 - 5e5,
    () => randomString(rng),
  ];
  return pickOne(rng, kinds)();
}

function randomValue(rng: Rng, depth: number): unknown {
  const roll = rng.next();
  if (depth >= MAX_DEPTH || roll < 0.4) {
    return randomLeaf(rng);
  }
  if (roll < 0.7) {
    return Array.from({ length: randomInt(rng, 0, 6) }, () => randomValue(rng, depth + 1));
  }
  const entries = Array.from({ length: randomInt(rng, 0, 5) }, () => [
    rng.next() < 0.7 ? pickOne(rng, AWKWARD_KEYS) : randomString(rng),
    randomValue(rng, depth + 1),
  ]);
  return Object.fromEntries(entries);
}

/** Replaces one value somewhere inside a valid sample, keeping the rest well-formed. */
function mutate(rng: Rng, value: unknown, depth: number): unknown {
  if (value === null || typeof value !== 'object' || rng.next() < 0.25 || depth >= MAX_DEPTH) {
    return randomValue(rng, depth);
  }
  if (Array.isArray(value)) {
    const copy: unknown[] = [...(value as unknown[])];
    const index = randomInt(rng, 0, copy.length);
    copy[index] = mutate(rng, copy[index], depth + 1);
    return copy;
  }
  const copy: Record<string, unknown> = { ...(value as Record<string, unknown>) };
  const keys = [...Object.keys(copy), pickOne(rng, AWKWARD_KEYS)];
  const key = pickOne(rng, keys);
  copy[key] = mutate(rng, copy[key], depth + 1);
  return copy;
}

function validSamples(code: C2S): unknown[] {
  return Object.values(C2S_SAMPLES[code]?.valid ?? {});
}

function fuzzPayload(rng: Rng, code: C2S): unknown {
  const roll = rng.next();
  if (roll < 0.3) {
    return randomValue(rng, 0);
  }
  if (code === C2S.Cmd && roll < 0.6) {
    return { rid: randomInt(rng, 0, 1_000), op: pickOne(rng, CMD_OPS), a: randomValue(rng, 1) };
  }
  return mutate(rng, pickOne(rng, validSamples(code)), 0);
}

describe('protocol fuzz', () => {
  it.each(C2S_CODES.map((code) => [C2S[code], code] as const))(
    '%s parsing never throws on random payloads',
    (_name, code) => {
      const rng = createTestRng(PROTOCOL_TEST_SEED + code);
      let accepted = 0;
      for (let round = 0; round < PAYLOADS_PER_CODE; round += 1) {
        const payload = fuzzPayload(rng, code);
        let result: ReturnType<typeof parseC2S> | undefined;
        expect(() => {
          result = parseC2S(code, payload);
        }).not.toThrow();
        expect(typeof result?.ok).toBe('boolean');
        accepted += result?.ok === true ? 1 : 0;
      }
      // Most mutations break the message; a run that accepts everything would mean no checks ran.
      expect(accepted).toBeLessThan(PAYLOADS_PER_CODE);
    },
  );

  it('the test generator replays the same stream from the same seed', () => {
    const first = createTestRng(PROTOCOL_TEST_SEED);
    const second = createTestRng(PROTOCOL_TEST_SEED);
    const streamA = Array.from({ length: 10 }, () => first.nextU32());
    const streamB = Array.from({ length: 10 }, () => second.nextU32());
    expect(streamA).toEqual(streamB);
    expect(new Set(streamA).size).toBe(10);
  });
});
