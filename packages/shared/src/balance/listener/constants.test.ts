import { describe, expect, it } from 'vitest';
import golden from '../__golden__/constants.json' with { type: 'json' };
import { isKKey, K } from '../constants.js';
import { isListenerKKey, K_LISTENER } from './constants.js';

const LISTENER_KEY = /^(SYNC|SP|DIS|UNBOUND|RES|CALM|LISTEN|JARRED)_/;

const goldenRows = Object.entries(golden);
const listenerKeys = Object.keys(K_LISTENER);

describe('listener balance constants', () => {
  it.each(goldenRows)('holds %s in exactly one table with its default', (key, value) => {
    const inPublic = Object.hasOwn(K, key);
    const inListener = Object.hasOwn(K_LISTENER, key);
    expect(inPublic !== inListener).toBe(true);
    const table: Readonly<Record<string, number>> = inPublic ? K : K_LISTENER;
    expect(table[key]).toBe(value);
  });

  it('shares no key with the public table', () => {
    expect(listenerKeys.filter((key) => Object.hasOwn(K, key))).toEqual([]);
  });

  it('is frozen and holds only finite numbers', () => {
    expect(Object.isFrozen(K_LISTENER)).toBe(true);
    expect(Object.isFrozen(K)).toBe(true);
    for (const [key, value] of Object.entries(K_LISTENER)) {
      expect(Number.isFinite(value), key).toBe(true);
    }
  });

  it('keeps every listener key under a listener prefix and no public key under one', () => {
    expect(listenerKeys.filter((key) => !LISTENER_KEY.test(key))).toEqual([]);
    expect(Object.keys(K).filter((key) => LISTENER_KEY.test(key))).toEqual([]);
  });

  it('answers key lookups for its own table only', () => {
    for (const key of listenerKeys) {
      expect(isListenerKKey(key)).toBe(true);
      expect(isKKey(key)).toBe(false);
    }
    expect(isListenerKKey('BURN_FRACTION')).toBe(false);
    expect(isListenerKKey('toString')).toBe(false);
  });
});
