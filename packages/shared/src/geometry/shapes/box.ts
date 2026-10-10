import { GEOMETRY_EPS } from '../geometry-constants.js';

/** A position in px (origin top-left, x east, y south). */
export interface GeoPoint {
  x: number;
  y: number;
}

/** An axis-aligned box in px, bounds inclusive. */
export interface BoxBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function pointInBox(p: GeoPoint, box: BoxBounds): boolean {
  return (
    p.x >= box.minX - GEOMETRY_EPS &&
    p.x <= box.maxX + GEOMETRY_EPS &&
    p.y >= box.minY - GEOMETRY_EPS &&
    p.y <= box.maxY + GEOMETRY_EPS
  );
}

/** The point of the box nearest to `p` (p itself when it lies inside). */
export function closestPointInBox(p: GeoPoint, box: BoxBounds): GeoPoint {
  return {
    x: Math.min(Math.max(p.x, box.minX), box.maxX),
    y: Math.min(Math.max(p.y, box.minY), box.maxY),
  };
}

export function boxCorners(box: BoxBounds): GeoPoint[] {
  return [
    { x: box.minX, y: box.minY },
    { x: box.maxX, y: box.minY },
    { x: box.maxX, y: box.maxY },
    { x: box.minX, y: box.maxY },
  ];
}

/** Narrows the segment parameter range [lo, hi] to where `start + t·delta` is within [min, max]. */
function clipAxis(
  start: number,
  delta: number,
  min: number,
  max: number,
  range: [number, number],
): boolean {
  if (delta === 0) return start >= min && start <= max;
  const t1 = (min - start) / delta;
  const t2 = (max - start) / delta;
  range[0] = Math.max(range[0], Math.min(t1, t2));
  range[1] = Math.min(range[1], Math.max(t1, t2));
  return range[0] <= range[1];
}

/** Whether the segment from `a` to `b` touches the box (edges included). */
export function segmentTouchesBox(a: GeoPoint, b: GeoPoint, box: BoxBounds): boolean {
  const range: [number, number] = [0, 1];
  return (
    clipAxis(a.x, b.x - a.x, box.minX - GEOMETRY_EPS, box.maxX + GEOMETRY_EPS, range) &&
    clipAxis(a.y, b.y - a.y, box.minY - GEOMETRY_EPS, box.maxY + GEOMETRY_EPS, range)
  );
}
