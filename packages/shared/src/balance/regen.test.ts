import { describe, expect, it } from 'vitest';
import golden from './__golden__/regen.json' with { type: 'json' };
import {
  canChangeLoadoutOrTitle,
  hpRegenPerS,
  isInCombat,
  logoutLingerS,
  manaRegenPerS,
  NEVER_DAMAGED,
} from './regen.js';

function agoOrNever(lastDamageAgoS: number | null): number {
  return lastDamageAgoS ?? NEVER_DAMAGED;
}

describe('combat state', () => {
  it.each(golden.combat)('$name', ({ lastDamageAgoS, inCombat }) => {
    expect(isInCombat(lastDamageAgoS)).toBe(inCombat);
  });

  it('a character that never fought is out of combat', () => {
    expect(isInCombat(NEVER_DAMAGED)).toBe(false);
  });

  it.each([-0.01, Number.NaN])('rejects elapsed time %s', (ago) => {
    expect(() => isInCombat(ago)).toThrow(RangeError);
  });
});

describe('loadout and Title changes', () => {
  it('are refused in combat', () => {
    expect(canChangeLoadoutOrTitle(5.99)).toBe(false);
  });

  it('are allowed once combat ends', () => {
    expect(canChangeLoadoutOrTitle(6)).toBe(true);
    expect(canChangeLoadoutOrTitle(NEVER_DAMAGED)).toBe(true);
  });
});

describe('health regeneration', () => {
  it.each(golden.hp)('$name', ({ inCombat, vit, maxHp, expected }) => {
    expect(hpRegenPerS(inCombat, vit, maxHp)).toBeCloseTo(expected, 4);
  });
});

describe('mana regeneration', () => {
  it.each(golden.mana)('$name', ({ inCombat, wis, expected }) => {
    expect(manaRegenPerS(inCombat, wis)).toBeCloseTo(expected, 4);
  });

  it('triples out of combat', () => {
    expect(manaRegenPerS(false, 17)).toBeCloseTo(3 * manaRegenPerS(true, 17), 4);
  });
});

describe('logout linger', () => {
  it.each(golden.linger)('$name', ({ lastDamageAgoS, inSafeZone, expected }) => {
    expect(logoutLingerS(agoOrNever(lastDamageAgoS), inSafeZone)).toBe(expected);
  });

  it('uses a longer window than the combat state', () => {
    expect(isInCombat(7)).toBe(false);
    expect(logoutLingerS(7, false)).toBe(60);
  });

  it('rejects a negative elapsed time', () => {
    expect(() => logoutLingerS(-1, false)).toThrow(RangeError);
  });
});
