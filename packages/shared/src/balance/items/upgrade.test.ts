import { describe, expect, it } from 'vitest';
import { RARITIES, type Rarity } from '../../types/items.js';
import golden from './__golden__/upgrade.json' with { type: 'json' };
import {
  canUpgrade,
  levelAfterFailure,
  shardFor,
  upgradeBaseMult,
  upgradeChance,
  upgradeCost,
} from './upgrade.js';

describe('upgrade chances', () => {
  it.each(golden.chances.map((chance, index) => [index + 1, chance]))(
    'step to +%i',
    (target, chance) => {
      expect(upgradeChance(target, 0)).toBe(chance);
    },
  );

  it.each(golden.smithing)(
    'smithing $level on the step to +$target',
    ({ level, target, chance }) => {
      expect(upgradeChance(target, level)).toBeCloseTo(chance, 6);
    },
  );

  it('has no step to +0 or past +15', () => {
    expect(() => upgradeChance(0, 0)).toThrow(RangeError);
    expect(() => upgradeChance(16, 0)).toThrow(RangeError);
  });
});

describe('upgrade failure', () => {
  it.each(golden.failure)('failing the step to +$target, ward $ward', ({ target, ward, after }) => {
    expect(levelAfterFailure(target, ward)).toBe(after);
  });
});

describe('upgrade cost', () => {
  const { rarity, ilvl, toSix, cumulative } = golden.rareIlvl10;

  it('costs shards and coins by step, item level and rarity', () => {
    const cost = upgradeCost(6, ilvl, rarity as Rarity);
    expect({ shards: cost.shards, coins: cost.coins }).toEqual(toSix);
    expect(cost.shardId).toBe('mat_tempering_shard_dull');
  });

  it('adds up over the first six steps', () => {
    let shards = 0;
    let coins = 0;
    for (let target = 1; target <= 6; target += 1) {
      const cost = upgradeCost(target, ilvl, rarity as Rarity);
      shards += cost.shards;
      coins += cost.coins;
    }
    expect({ shards, coins }).toEqual(cumulative);
  });

  it.each(golden.shardTiers)('item level $ilvl uses $shard', ({ ilvl, shard }) => {
    expect(shardFor(ilvl)).toBe(shard);
  });
});

describe('upgrade power and ceiling', () => {
  it.each(golden.baseMult)('+$level', ({ level, mult }) => {
    expect(upgradeBaseMult(level)).toBeCloseTo(mult, 6);
  });

  it('stops at each rarity ceiling', () => {
    for (const rarity of RARITIES) {
      const ceiling = golden.ceilings[rarity] ?? 0;
      expect(canUpgrade(ceiling - 1, rarity)).toBe(true);
      expect(canUpgrade(ceiling, rarity)).toBe(false);
    }
  });
});
