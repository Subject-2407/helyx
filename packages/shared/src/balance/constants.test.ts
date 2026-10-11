import { describe, expect, it } from 'vitest';
import golden from './__golden__/constants.json' with { type: 'json' };
import { isKKey, K } from './constants.js';
import { CHARACTER_K } from './constants/character.js';
import { COMBAT_K } from './constants/combat.js';
import { ITEMS_K } from './constants/items.js';
import { REVIVAL_K } from './constants/revival.js';
import { WORLD_K } from './constants/world.js';

const GROUPS = { CHARACTER_K, COMBAT_K, ITEMS_K, REVIVAL_K, WORLD_K };
const KEY_PATTERN = /^[A-Z][A-Z0-9_]+$/;
/** Prefixes of the keys kept in the separate table; none of them may be public. */
const SEPARATE_KEY = /^(SYNC|SP|DIS|UNBOUND|RES|CALM|LISTEN|JARRED)_/;

const publicRows = Object.entries(golden).filter(([key]) => !SEPARATE_KEY.test(key));

describe('balance constants', () => {
  it.each(publicRows)('holds %s with its default', (key, value) => {
    expect(isKKey(key)).toBe(true);
    expect(K[key as keyof typeof K]).toBe(value);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(K)).toBe(true);
  });

  it('holds only finite numbers under upper snake case keys', () => {
    for (const [key, value] of Object.entries(K)) {
      expect(key).toMatch(KEY_PATTERN);
      expect(Number.isFinite(value), key).toBe(true);
    }
  });

  it('holds no key of the separate table', () => {
    expect(Object.keys(K).filter((key) => SEPARATE_KEY.test(key))).toEqual([]);
  });

  it('never defines one key in two groups, so no value silently overrides another', () => {
    const seen = new Map<string, string>();
    for (const [group, values] of Object.entries(GROUPS)) {
      for (const key of Object.keys(values)) {
        expect(seen.get(key), `${key} in ${group}`).toBeUndefined();
        seen.set(key, group);
      }
    }
    expect(seen.size).toBe(Object.keys(K).length);
  });

  it('rejects keys it does not hold', () => {
    expect(isKKey('NOT_A_CONSTANT')).toBe(false);
    expect(isKKey('toString')).toBe(false);
  });

  it('keeps ability proficiency and profession keys apart', () => {
    const professionKeys = Object.keys(K).filter((key) => key.startsWith('PROFESSION_'));
    expect(professionKeys.length).toBeGreaterThan(0);
    expect(Object.keys(K).filter((key) => key.startsWith('PROF_'))).toEqual(
      Object.keys(COMBAT_K).filter((key) => key.startsWith('PROF_')),
    );
  });
});
