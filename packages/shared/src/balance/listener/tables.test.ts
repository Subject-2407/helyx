import { describe, expect, it } from 'vitest';
import { STATUS_TABLE } from '../constants.js';
import { STATUS_IDS } from '../../types/combat.js';
import { DISSONANCE_STATE_TABLE, LISTENER_STATUS_TABLE, SYNC_TIER_TABLE } from './tables.js';

describe('listener rule tables', () => {
  it('starts the attunement and strain bands at their thresholds', () => {
    expect(SYNC_TIER_TABLE.map((band) => band.min)).toEqual([0, 30, 60, 90]);
    expect(DISSONANCE_STATE_TABLE.map((band) => band.min)).toEqual([0, 50, 70, 90, 100]);
  });

  it('holds exactly the status rows the public table leaves out', () => {
    const publicIds = new Set(Object.keys(STATUS_TABLE));
    const separate = Object.keys(LISTENER_STATUS_TABLE);
    expect(separate.filter((name) => publicIds.has(name))).toEqual([]);
    expect([...publicIds, ...separate].sort()).toEqual([...STATUS_IDS].sort());
  });

  it('freezes every table', () => {
    for (const table of [SYNC_TIER_TABLE, DISSONANCE_STATE_TABLE, LISTENER_STATUS_TABLE]) {
      expect(Object.isFrozen(table)).toBe(true);
    }
  });
});
