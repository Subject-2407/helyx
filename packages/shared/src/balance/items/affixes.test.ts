import { describe, expect, it } from 'vitest';
import { createSfc32 } from '../../rng/sfc32.js';
import { SEED_A } from '../../testing/seeds.js';
import { RARITIES } from '../../types/items.js';
import { RARITY_TABLE } from '../constants.js';
import golden from './__golden__/affixes.json' with { type: 'json' };
import {
  affixAllowed,
  affixRange,
  affixValue,
  pickAffixes,
  rollAffixQuality,
  type AffixDef,
} from './affixes.js';

const DEFS = golden.defs as Readonly<Record<string, AffixDef>>;
const POOL = Object.values(DEFS);

function def(id: string): AffixDef {
  const found = DEFS[id];
  if (found === undefined) throw new Error(`missing fixture ${id}`);
  return found;
}

describe('affix ranges', () => {
  it.each(golden.ranges)('$affix at item level $ilvl', ({ affix, ilvl, min, max }) => {
    expect(affixRange(def(affix), ilvl)).toEqual({ min, max });
  });

  it('rejects item level zero', () => {
    expect(() => affixRange(def('aff_str'), 0)).toThrow(RangeError);
  });
});

describe('affix rolls', () => {
  it('never rolls below the rarity floor', () => {
    const rng = createSfc32(SEED_A);
    for (const rarity of RARITIES) {
      const floor = RARITY_TABLE[rarity].rollFloor;
      for (let roll = 0; roll < 500; roll += 1) {
        const quality = rollAffixQuality(floor, rng);
        expect(quality).toBeGreaterThanOrEqual(floor);
        expect(quality).toBeLessThanOrEqual(1);
      }
    }
  });

  it('places the value inside the range by quality, rounded by kind', () => {
    const range = affixRange(def('aff_max_hp'), 10);
    expect(range).toEqual({ min: 23, max: 50 });
    expect(affixValue(range, 0, 'flat')).toBe(23);
    expect(affixValue(range, 1, 'flat')).toBe(50);
    expect(affixValue(range, 0.5, 'flat')).toBe(37);
    expect(affixValue({ min: 0.015, max: 0.04 }, 0.5, 'pct')).toBe(0.028);
    expect(() => affixValue(range, 1.1, 'flat')).toThrow(RangeError);
  });
});

describe('affix picks', () => {
  it('never picks the same affix twice and respects slots and rarity', () => {
    const rng = createSfc32(SEED_A);
    for (let roll = 0; roll < 500; roll += 1) {
      const picked = pickAffixes(POOL, 'accessory', 5, 3, rng);
      expect(new Set(picked.map((a) => a.id)).size).toBe(picked.length);
      expect(picked).toHaveLength(3);
    }
    expect(
      pickAffixes(POOL, 'feet', 9, 5, rng)
        .map((a) => a.id)
        .sort(),
    ).toEqual(['aff_max_hp', 'aff_str']);
  });

  it('keeps rarity-gated affixes off lower rarities and skips excluded lines', () => {
    expect(affixAllowed(def('aff_sync_growth'), 'accessory', 3)).toBe(false);
    expect(affixAllowed(def('aff_sync_growth'), 'accessory', 4)).toBe(true);
    const rng = createSfc32(SEED_A);
    const picked = pickAffixes(POOL, 'accessory', 4, 4, rng, ['aff_str']);
    expect(picked.map((a) => a.id)).not.toContain('aff_str');
    expect(picked).toHaveLength(3);
  });
});
