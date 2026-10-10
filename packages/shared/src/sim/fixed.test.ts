import { describe, expect, it } from 'vitest';
import { createSfc32 } from '../rng/sfc32.js';
import { SEED_A } from '../testing/seeds.js';
import { DIR, dirFromVector, dirVector, facingDir } from './dir8.js';
import {
  fromAckUnits,
  packWirePos,
  quantizePos,
  quantizeStamina,
  toAckUnits,
  unpackWirePos,
} from './fixed.js';

describe('fixed precision', () => {
  it('quantizes positions to 1/64 px and stamina to 0.1', () => {
    expect(quantizePos(10.03125)).toBe(10.03125);
    expect(quantizePos(10.01)).toBe(10.015625);
    expect(quantizeStamina(80.25)).toBe(80.3);
    expect(quantizeStamina(31.04)).toBe(31);
  });

  it('packs positions as xq * 65536 + yq at 1/8 px', () => {
    expect(packWirePos(1, 2)).toBe(8 * 65_536 + 16);
    expect(unpackWirePos(8 * 65_536 + 16)).toEqual({ x: 1, y: 2 });
  });

  it('round-trips random positions within 1/8 px', () => {
    const rng = createSfc32(SEED_A);
    for (let index = 0; index < 1_000; index += 1) {
      const x = quantizePos(rng.next() * 8191);
      const y = quantizePos(rng.next() * 8191);
      const back = unpackWirePos(packWirePos(x, y));
      expect(Math.abs(back.x - x)).toBeLessThanOrEqual(1 / 16);
      expect(Math.abs(back.y - y)).toBeLessThanOrEqual(1 / 16);
    }
  });

  it('rejects positions outside the map range', () => {
    expect(() => packWirePos(-1, 0)).toThrow(RangeError);
    expect(() => packWirePos(0, 8192)).toThrow(RangeError);
  });

  it('converts to and from acknowledgement units', () => {
    expect(toAckUnits(10.015625)).toBe(641);
    expect(fromAckUnits(641)).toBe(10.015625);
  });
});

describe('directions', () => {
  it('has unit vectors for the eight directions and zero for none', () => {
    expect(dirVector(0)).toEqual([0, 0]);
    expect(dirVector(1)).toEqual([1, 0]);
    expect(dirVector(3)).toEqual([0, -1]);
    expect(dirVector(8)[0]).toBe(0.7071067811865476);
    expect(DIR).toHaveLength(9);
    expect(() => dirVector(9 as never)).toThrow(RangeError);
  });

  it('maps a vector back to its direction', () => {
    for (let dir = 0; dir <= 8; dir += 1) {
      const [x, y] = DIR[dir] ?? [0, 0];
      expect(dirFromVector(x * 3, y * 3)).toBe(dir);
    }
  });

  it('faces east or west without input', () => {
    expect(facingDir(1)).toBe(1);
    expect(facingDir(-1)).toBe(5);
  });
});
