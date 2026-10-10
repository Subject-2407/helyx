import { DEG_TO_RAD, GEOMETRY_EPS } from './geometry-constants.js';
import type { BoxBounds, GeoPoint } from './shapes/box.js';
import { arcRegion, circleRegion, rectRegion, type HitRegion } from './shapes/regions.js';

export type { BoxBounds, GeoPoint } from './shapes/box.js';
export type { HitRegion } from './shapes/regions.js';

/**
 * Where a hit shape sits relative to the attacker's feet: the first value is the distance along
 * the aim, the second a fixed screen-space vertical shift (negative lifts the shape from the feet
 * to the body, whatever the aim).
 */
export type HitOffset = readonly [alongAim: number, lift: number];

/** A pie slice centered on the aim, `angleDeg` wide in total. 360 degrees is a full circle. */
export interface ArcShape {
  type: 'arc';
  radius: number;
  angleDeg: number;
  offset: HitOffset;
}

export interface CircleShape {
  type: 'circle';
  radius: number;
  offset: HitOffset;
}

/** A rectangle that starts at its origin and reaches `length` along the aim, `width` across. */
export interface RectShape {
  type: 'rect';
  length: number;
  width: number;
  offset: HitOffset;
}

export type HitShape = ArcShape | CircleShape | RectShape;

/** The attacker's feet position in px and aim in radians (0 east, clockwise, y down). */
export interface HitPose {
  x: number;
  y: number;
  aim: number;
}

/** A body that can be hit: `w` × `h` px, bottom-center on the feet point (`x`, `y`). */
export interface Hurtbox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function hurtboxBounds(hurtbox: Hurtbox): BoxBounds {
  const half = hurtbox.w / 2;
  return {
    minX: hurtbox.x - half,
    maxX: hurtbox.x + half,
    minY: hurtbox.y - hurtbox.h,
    maxY: hurtbox.y,
  };
}

/** The point a shape is measured from: the arc or circle center, or the rectangle's near edge. */
export function hitShapeOrigin(shape: HitShape, pose: HitPose): GeoPoint {
  const [alongAim, lift] = shape.offset;
  return {
    x: pose.x + alongAim * Math.cos(pose.aim),
    y: pose.y + alongAim * Math.sin(pose.aim) + lift,
  };
}

/** Places a shape in the world for a pose. Build it once when testing many targets. */
export function placeHitShape(shape: HitShape, pose: HitPose): HitRegion {
  const origin = hitShapeOrigin(shape, pose);
  switch (shape.type) {
    case 'arc':
      return arcRegion(origin, pose.aim, shape.radius, (shape.angleDeg / 2) * DEG_TO_RAD);
    case 'circle':
      return circleRegion(origin, shape.radius);
    case 'rect':
      return rectRegion(origin, pose.aim, shape.length, shape.width);
  }
}

/** Whether a hit shape overlaps a hurtbox. Touching edges count as a hit. */
export function shapeOverlapsHurtbox(shape: HitShape, pose: HitPose, hurtbox: Hurtbox): boolean {
  return placeHitShape(shape, pose).touchesBox(hurtboxBounds(hurtbox));
}

export function pointInShape(shape: HitShape, pose: HitPose, point: GeoPoint): boolean {
  return placeHitShape(shape, pose).containsPoint(point);
}

/** A moving circle such as a projectile against a hurtbox. Touching counts. */
export function circleOverlapsHurtbox(center: GeoPoint, radius: number, hurtbox: Hurtbox): boolean {
  return circleRegion(center, radius).touchesBox(hurtboxBounds(hurtbox));
}

export interface GeoCircle {
  x: number;
  y: number;
  radius: number;
}

/** Whether two circles overlap. Touching counts. */
export function circlesOverlap(a: GeoCircle, b: GeoCircle): boolean {
  return Math.hypot(b.x - a.x, b.y - a.y) <= a.radius + b.radius + GEOMETRY_EPS;
}
