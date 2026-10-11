import { describe, expect, it } from 'vitest';
import * as root from './index.js';
import * as listener from './listener.js';

/** Words that must never appear in a key or string value the public entry exports. */
const HIDDEN_WORDS = /sync|disson|resonan|listen|attun|unbound|folio|exile|circuit/i;

/** Every object key and string value reachable from a value, through objects, arrays, sets and maps. */
function collectNames(value: unknown, seen = new WeakSet<object>()): string[] {
  if (typeof value === 'string') return [value];
  if (typeof value !== 'object' || value === null || seen.has(value)) return [];
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

const rootNames = collectNames({ ...root });
const listenerKeys = Object.keys(listener.K_LISTENER);

describe('listener entry point', () => {
  it('exports none of its names from the root entry', () => {
    const rootExports = new Set(Object.keys(root));
    expect(Object.keys(listener).filter((name) => rootExports.has(name))).toEqual([]);
  });

  it('leaves no listener constant key anywhere in the root entry', () => {
    const names = new Set(rootNames);
    expect(names.has('BURN_FRACTION')).toBe(true);
    expect(listenerKeys.filter((key) => names.has(key))).toEqual([]);
    expect(listenerKeys.filter((key) => Object.hasOwn(root.K, key))).toEqual([]);
  });

  it('leaves no hidden word in any key or string value of the root entry', () => {
    expect(rootNames.filter((name) => HIDDEN_WORDS.test(name))).toEqual([]);
  });

  it('exports the listener constants, tables and formulas', () => {
    expect(listenerKeys.length).toBeGreaterThan(0);
    for (const table of [
      listener.SYNC_TIER_TABLE,
      listener.DISSONANCE_STATE_TABLE,
      listener.LISTENER_STATUS_TABLE,
    ]) {
      expect(Object.isFrozen(table)).toBe(true);
    }
    for (const formula of [
      listener.isListenerKKey,
      listener.attunedManaFactor,
      listener.syncPower,
      listener.syncDissonanceCost,
      listener.syncEcho,
      listener.syncTier,
      listener.dissonanceState,
      listener.addStrain,
      listener.resonanceAt,
      listener.calmReward,
    ]) {
      expect(typeof formula).toBe('function');
    }
  });
});
