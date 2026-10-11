import { describe, expect, it } from 'vitest';
import { ARCHETYPES } from '../types/combat.js';
import { ASPECTS, type Aspect } from '../types/aspect.js';
import { RARITIES, RARITY_KEYS } from '../types/items.js';
import { STATUS_IDS } from '../types/combat.js';
import golden from './__golden__/tables.json' with { type: 'json' };
import {
  ARCHETYPE_TABLE,
  ASPECT_BEATS,
  CC_DR_STEPS,
  CRYSTAL_UNITS,
  ENCHANT_GRADES,
  ENCUMBRANCE_BANDS,
  LEVEL_DIFF_XP_BANDS,
  POISE_HIT_DAMAGE,
  RARITY_TABLE,
  SHARD_TIERS,
  STATUS_TABLE,
  UPGRADE_TABLE,
} from './constants.js';

/** JSON has no infinity, so the golden files write an open upper bound as null. */
function openBound(value: number): number | null {
  return value === Number.POSITIVE_INFINITY ? null : value;
}

describe('rule tables', () => {
  it.each(ARCHETYPES.map((name) => [name]))('archetype %s matches its golden row', (name) => {
    const { isBoss: _isBoss, ...row } = ARCHETYPE_TABLE[name];
    expect(row).toEqual(golden.archetypes[name]);
  });

  it('marks exactly the three boss archetypes as bosses', () => {
    const bosses = ARCHETYPES.filter((name) => ARCHETYPE_TABLE[name].isBoss);
    expect(bosses).toEqual(['instance_boss', 'trial_boss', 'boss']);
  });

  it.each(RARITIES.map((rarity) => [rarity]))('rarity %i matches its golden row', (rarity) => {
    const { key, ...row } = golden.rarities[rarity] ?? { key: '' };
    expect(RARITY_KEYS[rarity]).toBe(key);
    expect(RARITY_TABLE[rarity]).toEqual(row);
  });

  it('lists upgrade chances and failure rules for +1 to +15', () => {
    expect(UPGRADE_TABLE.map((row) => row.chance)).toEqual(golden.upgradeChances);
    expect(UPGRADE_TABLE.map((row) => row.onFailure)).toEqual(golden.upgradeFailures);
  });

  it('lists the three enchant grades and the crystal units', () => {
    expect(ENCHANT_GRADES).toEqual(golden.enchantGrades);
    expect(CRYSTAL_UNITS).toEqual(golden.crystalUnits);
  });

  it('lists the level difference and load bands', () => {
    const bands = LEVEL_DIFF_XP_BANDS.map((band) => ({
      ...band,
      maxDelta: openBound(band.maxDelta),
    }));
    expect(bands).toEqual(golden.levelDiffBands);
    const load = ENCUMBRANCE_BANDS.map((band) => ({ ...band, maxRatio: openBound(band.maxRatio) }));
    expect(load).toEqual(golden.encumbranceBands);
  });

  it('orders shard tiers by item level band', () => {
    expect(SHARD_TIERS.map((tier) => openBound(tier.maxIlvl))).toEqual([20, 40, 60, 80, null]);
  });

  it('has a status row for every public status effect', () => {
    const separate = new Set(['jarred']);
    const publicIds = STATUS_IDS.filter((name) => !separate.has(name));
    expect(Object.keys(STATUS_TABLE).sort()).toEqual([...publicIds].sort());
    expect(STATUS_TABLE.bleed.maxStacks).toBe(3);
  });

  it('diminishes control from full to half to a quarter', () => {
    expect(CC_DR_STEPS).toEqual([1, 0.5, 0.25]);
  });

  it('gives default poise damage per basic hit kind', () => {
    expect(POISE_HIT_DAMAGE).toEqual({ basic: 10, dagger: 6, greatsword: 25, bow_charged: 20 });
  });

  it('turns the counter cycle through all six Aspects once', () => {
    const visited = new Set<Aspect>();
    let current: Aspect = 'entropy';
    for (let step = 0; step < ASPECTS.length; step += 1) {
      visited.add(current);
      current = ASPECT_BEATS[current];
    }
    expect(current).toBe('entropy');
    expect(visited.size).toBe(ASPECTS.length);
  });

  it('freezes every table', () => {
    for (const table of [
      ARCHETYPE_TABLE,
      RARITY_TABLE,
      UPGRADE_TABLE,
      STATUS_TABLE,
      ASPECT_BEATS,
    ]) {
      expect(Object.isFrozen(table)).toBe(true);
    }
  });
});
