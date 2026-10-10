import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES,
  ASPECTS,
  CollisionCell,
  DAY_PHASES,
  DIR8_VALUES,
  EQUIP_SLOTS,
  MoveFlag,
  RARITIES,
  RARITY_KEYS,
  SEASONS,
  STAT_KEYS,
  STATUS_IDS,
  WEAPON_CATEGORIES,
} from './index.js';

describe('shared vocabulary', () => {
  it('lists the six Aspects in canonical order', () => {
    expect(ASPECTS).toEqual(['growth', 'entropy', 'order', 'change', 'force', 'void']);
  });

  it('lists the six primary stats', () => {
    expect(STAT_KEYS).toEqual(['str', 'dex', 'agi', 'vit', 'int', 'wis']);
  });

  it('has eight equipment slots with two accessory slots', () => {
    expect(EQUIP_SLOTS).toHaveLength(8);
    expect(EQUIP_SLOTS.filter((slot) => slot.startsWith('accessory'))).toHaveLength(2);
  });

  it('has ten rarities whose number is their position', () => {
    expect(RARITY_KEYS).toHaveLength(10);
    expect(RARITIES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(RARITY_KEYS[0]).toBe('common');
    expect(RARITY_KEYS[9]).toBe('celestial');
  });

  it('has all nine monster archetypes', () => {
    expect(ARCHETYPES).toHaveLength(9);
    expect(ARCHETYPES).toContain('instance_boss');
    expect(ARCHETYPES).toContain('trial_boss');
  });

  it('treats the fist as a weapon category of its own', () => {
    expect(WEAPON_CATEGORIES).toContain('fist');
  });

  it('lists fourteen status effects, the day phases and the seasons', () => {
    expect(STATUS_IDS).toHaveLength(14);
    expect(DAY_PHASES).toEqual(['dawn', 'day', 'dusk', 'night']);
    expect(SEASONS).toEqual(['spring', 'summer', 'autumn', 'winter']);
  });

  it('numbers movement directions 0 to 8', () => {
    expect(DIR8_VALUES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('uses one distinct bit per movement flag', () => {
    const bits = Object.values(MoveFlag);
    expect(bits).toEqual([1, 2, 4, 8, 16, 32, 64]);
    expect(bits.reduce((all, bit) => all | bit, 0)).toBe(127);
  });

  it('numbers collision cells free, solid, water, low wall', () => {
    expect(CollisionCell).toEqual({ FREE: 0, SOLID: 1, WATER: 2, LOW_WALL: 3 });
  });
});
