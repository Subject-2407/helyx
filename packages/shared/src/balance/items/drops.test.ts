import { describe, expect, it } from 'vitest';
import { createSfc32 } from '../../rng/sfc32.js';
import { SEED_A } from '../../testing/seeds.js';
import golden from './__golden__/drops.json' with { type: 'json' };
import { equipmentDropCount, essenceDrop, rollItemLevel } from './drops.js';

describe('equipment drop counts', () => {
  it.each(Object.entries(golden.equipmentChance))('%s drops at its chance', (_name, rate) => {
    const rng = createSfc32(SEED_A);
    let drops = 0;
    for (let roll = 0; roll < golden.rolls; roll += 1) {
      drops += equipmentDropCount({ kind: 'normal', chance: rate }, rng);
    }
    expect(Math.abs(drops / golden.rolls - rate)).toBeLessThan(golden.tolerance);
  });

  it('always drops from an elite, and a second item at its chance', () => {
    const rng = createSfc32(SEED_A);
    let seconds = 0;
    for (let roll = 0; roll < golden.rolls; roll += 1) {
      const count = equipmentDropCount({ kind: 'elite' }, rng);
      expect(count).toBeGreaterThanOrEqual(1);
      seconds += count - 1;
    }
    expect(Math.abs(seconds / golden.rolls - golden.eliteSecond)).toBeLessThan(golden.tolerance);
  });

  it.each(golden.worldBoss)('world boss with $groups groups', ({ groups, items }) => {
    const rng = createSfc32(SEED_A);
    expect(equipmentDropCount({ kind: 'world_boss', eligibleGroups: groups }, rng)).toBe(items);
  });

  it.each(golden.instanceBoss)('instance boss for a party of $party', ({ party, items }) => {
    const rng = createSfc32(SEED_A);
    expect(equipmentDropCount({ kind: 'instance_boss', partySize: party }, rng)).toBe(items);
  });
});

describe('item level', () => {
  it('stays within one level of the monster and never reaches zero', () => {
    const rng = createSfc32(SEED_A);
    const seen = new Set<number>();
    for (let roll = 0; roll < 1_000; roll += 1) {
      const ilvl = rollItemLevel(10, rng);
      expect(Math.abs(ilvl - 10)).toBeLessThanOrEqual(1);
      seen.add(ilvl);
      expect(rollItemLevel(1, rng)).toBeGreaterThanOrEqual(1);
    }
    expect([...seen].sort()).toEqual([10, 11, 9].sort());
  });
});

describe('essences', () => {
  it('drop at the class rates, three at a time from bosses', () => {
    const rng = createSfc32(SEED_A);
    let normal = 0;
    let elite = 0;
    for (let roll = 0; roll < golden.rolls; roll += 1) {
      normal += essenceDrop('normal', true, rng);
      elite += essenceDrop('elite', true, rng);
    }
    expect(Math.abs(normal / golden.rolls - golden.essence.normal)).toBeLessThan(golden.tolerance);
    expect(Math.abs(elite / golden.rolls - golden.essence.elite)).toBeLessThan(golden.tolerance);
    expect(essenceDrop('boss', true, rng)).toBe(golden.essence.bossCount);
  });

  it('never drop from a monster without a primary Aspect', () => {
    expect(essenceDrop('boss', false, createSfc32(SEED_A))).toBe(0);
  });
});
