import { GEOMETRY_EPS } from '../geometry-constants.js';
import {
  boxCorners,
  closestPointInBox,
  pointInBox,
  segmentTouchesBox,
  type BoxBounds,
  type GeoPoint,
} from './box.js';

/**
 * A hit area placed in the world. Every test is inclusive: a shape that only touches a box or a
 * point along an edge or a corner still counts as overlapping it.
 */
export interface HitRegion {
  containsPoint(p: GeoPoint): boolean;
  touchesBox(box: BoxBounds): boolean;
}

function distance(a: GeoPoint, b: GeoPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** A full disc around `origin`. */
export function circleRegion(origin: GeoPoint, radius: number): HitRegion {
  return {
    containsPoint: (p) => distance(origin, p) <= radius + GEOMETRY_EPS,
    touchesBox: (box) => distance(origin, closestPointInBox(origin, box)) <= radius + GEOMETRY_EPS,
  };
}

/**
 * A pie slice of `halfAngle` on each side of the aim. Against a box: the box point nearest the
 * origin is either inside the slice (hit), out of reach (miss), or beside the slice, and then any
 * contact must cross one of the slice's two straight edges.
 */
export function arcRegion(
  origin: GeoPoint,
  aim: number,
  radius: number,
  halfAngle: number,
): HitRegion {
  if (halfAngle >= Math.PI) return circleRegion(origin, radius);
  const ux = Math.cos(aim);
  const uy = Math.sin(aim);
  const withinSlice = (p: GeoPoint): boolean => {
    const dx = p.x - origin.x;
    const dy = p.y - origin.y;
    if (dx === 0 && dy === 0) return true;
    return Math.abs(Math.atan2(ux * dy - uy * dx, ux * dx + uy * dy)) <= halfAngle + GEOMETRY_EPS;
  };
  const edgeEnd = (side: number): GeoPoint => ({
    x: origin.x + radius * Math.cos(aim + side * halfAngle),
    y: origin.y + radius * Math.sin(aim + side * halfAngle),
  });
  const edges = [edgeEnd(1), edgeEnd(-1)];
  return {
    containsPoint: (p) => distance(origin, p) <= radius + GEOMETRY_EPS && withinSlice(p),
    touchesBox: (box) => {
      if (pointInBox(origin, box)) return true;
      const nearest = closestPointInBox(origin, box);
      if (distance(origin, nearest) > radius + GEOMETRY_EPS) return false;
      if (withinSlice(nearest)) return true;
      return edges.some((end) => segmentTouchesBox(origin, end, box));
    },
  };
}

function project(points: readonly GeoPoint[], ax: number, ay: number): [number, number] {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const p of points) {
    const d = p.x * ax + p.y * ay;
    min = Math.min(min, d);
    max = Math.max(max, d);
  }
  return [min, max];
}

/**
 * A rectangle whose near edge is centered on `origin`, reaching `length` along the aim and
 * `width` across it. Against a box it uses separating axes: they overlap unless the projections
 * onto one of the four edge directions leave a gap.
 */
export function rectRegion(
  origin: GeoPoint,
  aim: number,
  length: number,
  width: number,
): HitRegion {
  const ux = Math.cos(aim);
  const uy = Math.sin(aim);
  const half = width / 2;
  const corner = (along: number, across: number): GeoPoint => ({
    x: origin.x + ux * along - uy * across,
    y: origin.y + uy * along + ux * across,
  });
  const corners = [corner(0, -half), corner(length, -half), corner(length, half), corner(0, half)];
  const axes: readonly (readonly [number, number])[] = [
    [1, 0],
    [0, 1],
    [ux, uy],
    [-uy, ux],
  ];
  return {
    containsPoint: (p) => {
      const dx = p.x - origin.x;
      const dy = p.y - origin.y;
      const along = dx * ux + dy * uy;
      const across = dy * ux - dx * uy;
      return (
        along >= -GEOMETRY_EPS &&
        along <= length + GEOMETRY_EPS &&
        Math.abs(across) <= half + GEOMETRY_EPS
      );
    },
    touchesBox: (box) => {
      const boxPoints = boxCorners(box);
      return axes.every(([ax, ay]) => {
        const [minA, maxA] = project(corners, ax, ay);
        const [minB, maxB] = project(boxPoints, ax, ay);
        return maxA >= minB - GEOMETRY_EPS && maxB >= minA - GEOMETRY_EPS;
      });
    },
  };
}
