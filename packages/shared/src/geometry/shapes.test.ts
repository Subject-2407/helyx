import { describe, expect, it } from 'vitest';
import {
  circleOverlapsHurtbox,
  circlesOverlap,
  hitShapeOrigin,
  pointInShape,
  shapeOverlapsHurtbox,
  type HitPose,
  type HitShape,
  type Hurtbox,
} from './shapes.js';
import { radiansToWireAngle, wireAngleToRadians } from './angle.js';

const EAST = 0;
const SOUTH = Math.PI / 2;
const WEST = Math.PI;
const NO_OFFSET = [0, 0] as const;
const AT_ORIGIN: HitPose = { x: 0, y: 0, aim: EAST };

function hurtbox(x: number, y: number, w = 10, h = 10): Hurtbox {
  return { x, y, w, h };
}

describe('wire angles', () => {
  it.each([
    [0, 0],
    [16_384, Math.PI / 2],
    [32_768, Math.PI],
    [49_152, (3 * Math.PI) / 2],
  ])('wire angle %i is %f radians', (wire, radians) => {
    expect(wireAngleToRadians(wire)).toBeCloseTo(radians, 12);
    expect(radiansToWireAngle(radians)).toBe(wire);
  });

  it('wraps negative and full-turn angles into the wire range', () => {
    expect(radiansToWireAngle(-Math.PI / 2)).toBe(49_152);
    expect(radiansToWireAngle(2 * Math.PI)).toBe(0);
    expect(radiansToWireAngle(2 * Math.PI - 1e-9)).toBe(0);
  });

  it.each([-1, 65_536, 1.5, Number.NaN])('rejects wire angle %f', (wire) => {
    expect(() => wireAngleToRadians(wire)).toThrow(RangeError);
  });

  it('rejects a non-finite aim', () => {
    expect(() => radiansToWireAngle(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('hitbox origin', () => {
  const circle: HitShape = { type: 'circle', radius: 4, offset: [20, -8] };
  const pose = { x: 100, y: 100 };

  it('moves the first offset along the aim and lifts by the second', () => {
    expect(hitShapeOrigin(circle, { ...pose, aim: EAST })).toEqual({ x: 120, y: 92 });
    const south = hitShapeOrigin(circle, { ...pose, aim: SOUTH });
    expect(south.x).toBeCloseTo(100, 9);
    expect(south.y).toBeCloseTo(112, 9);
    const west = hitShapeOrigin(circle, { ...pose, aim: WEST });
    expect(west.x).toBeCloseTo(80, 9);
    expect(west.y).toBeCloseTo(92, 9);
  });

  it('hits what is in front of the caster and not what is under it', () => {
    const reach: HitShape = { type: 'circle', radius: 4, offset: [20, 0] };
    const caster = { x: 100, y: 100, aim: EAST };
    expect(pointInShape(reach, caster, { x: 120, y: 100 })).toBe(true);
    expect(pointInShape(reach, caster, { x: 100, y: 100 })).toBe(false);
  });
});

describe('hurtbox anchoring and edge contact', () => {
  const circle: HitShape = { type: 'circle', radius: 5, offset: NO_OFFSET };

  it('extends the hurtbox upward from the feet', () => {
    expect(shapeOverlapsHurtbox(circle, AT_ORIGIN, hurtbox(0, 15))).toBe(true);
    expect(shapeOverlapsHurtbox(circle, AT_ORIGIN, hurtbox(0, 15.1))).toBe(false);
    expect(shapeOverlapsHurtbox(circle, AT_ORIGIN, hurtbox(0, -5.1, 10, 1))).toBe(false);
  });

  it('centers the hurtbox horizontally on the feet', () => {
    expect(shapeOverlapsHurtbox(circle, AT_ORIGIN, hurtbox(10, 5))).toBe(true);
    expect(shapeOverlapsHurtbox(circle, AT_ORIGIN, hurtbox(-10.1, 5))).toBe(false);
  });

  it('counts touching edges as a hit', () => {
    expect(circleOverlapsHurtbox({ x: 0, y: 0 }, 5, hurtbox(10, 5))).toBe(true);
    expect(circlesOverlap({ x: 0, y: 0, radius: 3 }, { x: 5, y: 0, radius: 2 })).toBe(true);
    expect(circlesOverlap({ x: 0, y: 0, radius: 3 }, { x: 5.01, y: 0, radius: 2 })).toBe(false);
  });
});

describe('arc', () => {
  const arc: HitShape = { type: 'arc', radius: 40, angleDeg: 90, offset: NO_OFFSET };

  function polar(deg: number, distance: number): { x: number; y: number } {
    const rad = (deg * Math.PI) / 180;
    return { x: distance * Math.cos(rad), y: distance * Math.sin(rad) };
  }

  it.each([
    ['on the aim line', 0, true],
    ['at the clockwise half-angle', 45, true],
    ['at the counter-clockwise half-angle', -45, true],
    ['one degree past the clockwise edge', 46, false],
    ['one degree past the counter-clockwise edge', -46, false],
    ['behind the caster', 180, false],
  ])('a point %s', (_label, deg, inside) => {
    expect(pointInShape(arc, AT_ORIGIN, polar(deg, 20))).toBe(inside);
  });

  it('stops at its radius', () => {
    expect(pointInShape(arc, AT_ORIGIN, { x: 40, y: 0 })).toBe(true);
    expect(pointInShape(arc, AT_ORIGIN, { x: 40.01, y: 0 })).toBe(false);
  });

  it('hits a box that touches its edge only at a corner', () => {
    expect(shapeOverlapsHurtbox(arc, AT_ORIGIN, hurtbox(15, -20))).toBe(true);
    expect(shapeOverlapsHurtbox(arc, AT_ORIGIN, hurtbox(14.5, -20))).toBe(false);
  });

  it('hits a tall box that straddles the aim line without a corner inside', () => {
    expect(shapeOverlapsHurtbox(arc, AT_ORIGIN, { x: 25, y: 60, w: 10, h: 120 })).toBe(true);
  });

  it('hits a box around its own origin', () => {
    expect(shapeOverlapsHurtbox(arc, AT_ORIGIN, hurtbox(0, 5))).toBe(true);
  });

  it('misses a box behind the caster that a full circle would hit', () => {
    const behind = hurtbox(-20, 5);
    expect(shapeOverlapsHurtbox(arc, AT_ORIGIN, behind)).toBe(false);
    const circle: HitShape = { type: 'circle', radius: 40, offset: NO_OFFSET };
    expect(shapeOverlapsHurtbox(circle, AT_ORIGIN, behind)).toBe(true);
  });

  it('behaves like a circle at 360 degrees', () => {
    const full: HitShape = { type: 'arc', radius: 30, angleDeg: 360, offset: NO_OFFSET };
    const circle: HitShape = { type: 'circle', radius: 30, offset: NO_OFFSET };
    for (let x = -50; x <= 50; x += 5) {
      for (let y = -50; y <= 60; y += 5) {
        for (const aim of [0, 1, Math.PI, -2.5]) {
          const pose = { x: 0, y: 0, aim };
          const box = hurtbox(x, y, 6, 8);
          expect(shapeOverlapsHurtbox(full, pose, box)).toBe(
            shapeOverlapsHurtbox(circle, pose, box),
          );
          expect(pointInShape(full, pose, { x, y })).toBe(pointInShape(circle, pose, { x, y }));
        }
      }
    }
  });

  it('turns with the aim', () => {
    const south = { x: 0, y: 0, aim: SOUTH };
    expect(pointInShape(arc, south, { x: 0, y: 30 })).toBe(true);
    expect(pointInShape(arc, south, { x: 30, y: 0 })).toBe(false);
  });

  it('wider than a half turn still excludes the area behind it', () => {
    const wide: HitShape = { type: 'arc', radius: 40, angleDeg: 270, offset: NO_OFFSET };
    expect(pointInShape(wide, AT_ORIGIN, polar(135, 20))).toBe(true);
    expect(pointInShape(wide, AT_ORIGIN, polar(180, 20))).toBe(false);
    expect(shapeOverlapsHurtbox(wide, AT_ORIGIN, hurtbox(-20, 2, 4, 4))).toBe(false);
  });
});

describe('rect', () => {
  const rect: HitShape = { type: 'rect', length: 24, width: 14, offset: NO_OFFSET };

  it('extends forward from its near edge at 0 degrees', () => {
    expect(pointInShape(rect, AT_ORIGIN, { x: 0, y: 0 })).toBe(true);
    expect(pointInShape(rect, AT_ORIGIN, { x: 24, y: 7 })).toBe(true);
    expect(pointInShape(rect, AT_ORIGIN, { x: 24.1, y: 0 })).toBe(false);
    expect(pointInShape(rect, AT_ORIGIN, { x: -0.1, y: 0 })).toBe(false);
    expect(pointInShape(rect, AT_ORIGIN, { x: 10, y: -7.1 })).toBe(false);
  });

  it('turns to face south at 90 degrees', () => {
    const south = { x: 0, y: 0, aim: wireAngleToRadians(16_384) };
    expect(pointInShape(rect, south, { x: 7, y: 24 })).toBe(true);
    expect(pointInShape(rect, south, { x: 0, y: -1 })).toBe(false);
    expect(pointInShape(rect, south, { x: 8, y: 10 })).toBe(false);
    expect(shapeOverlapsHurtbox(rect, south, hurtbox(0, 34))).toBe(true);
    expect(shapeOverlapsHurtbox(rect, south, hurtbox(0, 34.1))).toBe(false);
  });

  it('lies along the diagonal at 45 degrees', () => {
    const diagonal = { x: 0, y: 0, aim: Math.PI / 4 };
    expect(pointInShape(rect, diagonal, { x: 12, y: 12 })).toBe(true);
    expect(pointInShape(rect, diagonal, { x: 17, y: 17 })).toBe(false);
    expect(pointInShape(rect, diagonal, { x: 4.9, y: -4.9 })).toBe(true);
    expect(pointInShape(rect, diagonal, { x: 5, y: -5 })).toBe(false);
  });

  it('misses a box inside its bounding box but off the rotated strip', () => {
    const strip: HitShape = { type: 'rect', length: 24, width: 4, offset: NO_OFFSET };
    const diagonal = { x: 0, y: 0, aim: Math.PI / 4 };
    expect(shapeOverlapsHurtbox(strip, diagonal, hurtbox(14, 6, 4, 4))).toBe(false);
    expect(shapeOverlapsHurtbox(strip, diagonal, hurtbox(12, 10, 4, 4))).toBe(true);
  });

  it('is placed by its offset along the aim', () => {
    const pushed: HitShape = { type: 'rect', length: 24, width: 14, offset: [6, 0] };
    expect(pointInShape(pushed, AT_ORIGIN, { x: 3, y: 0 })).toBe(false);
    expect(pointInShape(pushed, AT_ORIGIN, { x: 30, y: 0 })).toBe(true);
  });
});
