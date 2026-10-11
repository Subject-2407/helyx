import { describe, expect, it } from 'vitest';
import { S2C } from './codes.js';
import { ERROR_CODES } from './errors.js';
import * as publicEntry from './index.js';
import {
  LISTENER_ERROR_CODES,
  LISTENER_ERROR_FALLBACK,
  S2C_LISTENER,
  isListenerErrorCode,
  wireErrorCode,
} from './listener.js';

/** Words that must never appear in a key or string value the public entry exports. */
const HIDDEN_WORDS = /sync|listen|attun|disson|resonan|cast_?toggle/i;

function isSchema(value: object): boolean {
  return '_zod' in value;
}

/**
 * Every object key and string value reachable from a value, through plain objects, arrays, sets
 * and maps. Validator schemas are skipped: they hold the validation library's internals, not names
 * this package chooses.
 */
function collectNames(value: unknown, seen = new WeakSet<object>()): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null || seen.has(value) || isSchema(value)) return [];
  seen.add(value);
  let children: unknown[];
  if (value instanceof Map) {
    children = [...(value as Map<unknown, unknown>).entries()].flat();
  } else if (value instanceof Set) {
    children = [...(value as Set<unknown>)];
  } else {
    children = [...Object.keys(value), ...(Object.values(value) as unknown[])];
  }
  return children.flatMap((child) => collectNames(child, seen));
}

describe('Listener-only protocol names', () => {
  it('the first Listening message keeps its contract number', () => {
    expect(S2C_LISTENER).toEqual({ FirstListening: 25 });
    expect(Object.isFrozen(S2C_LISTENER)).toBe(true);
  });

  it('their numbers are left unused by the public server to client codes', () => {
    const publicValues = new Set<number>(
      Object.values(S2C).filter((value) => typeof value === 'number'),
    );
    for (const code of Object.values(S2C_LISTENER)) {
      expect(publicValues.has(code)).toBe(false);
    }
  });

  it('their failure reasons are not public error codes', () => {
    const publicCodes = new Set<string>(ERROR_CODES);
    for (const code of LISTENER_ERROR_CODES) {
      expect(publicCodes.has(code)).toBe(false);
    }
    expect(Object.isFrozen(LISTENER_ERROR_CODES)).toBe(true);
  });

  it('the fallback is a public code that names nothing hidden', () => {
    expect(ERROR_CODES).toContain(LISTENER_ERROR_FALLBACK);
    expect(LISTENER_ERROR_FALLBACK).not.toMatch(HIDDEN_WORDS);
  });

  it('recognizes Listener-only reasons only', () => {
    for (const code of LISTENER_ERROR_CODES) {
      expect(isListenerErrorCode(code)).toBe(true);
    }
    for (const value of ['', 'invalid', 'not_available', 'SYNC_CAP', 3, null, undefined]) {
      expect(isListenerErrorCode(value)).toBe(false);
    }
  });

  it('a player who is not a Listener gets the neutral code instead', () => {
    for (const code of LISTENER_ERROR_CODES) {
      expect(wireErrorCode(code, false)).toBe(LISTENER_ERROR_FALLBACK);
      expect(wireErrorCode(code, true)).toBe(code);
    }
  });

  it('public codes reach every player unchanged', () => {
    for (const code of ERROR_CODES) {
      expect(wireErrorCode(code, false)).toBe(code);
      expect(wireErrorCode(code, true)).toBe(code);
    }
  });

  it('the public entry exports no hidden name', () => {
    const names = collectNames({ ...publicEntry });
    expect(names.filter((name) => HIDDEN_WORDS.test(name))).toEqual([]);
    expect(Object.values(publicEntry)).not.toContain(S2C_LISTENER);
  });
});
