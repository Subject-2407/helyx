/**
 * Argument checks for the balance formulas. A formula given a value outside its domain is a
 * programming error, so these throw a `RangeError` with a plain message instead of returning
 * a wrong number.
 */

/** Throws unless `value` is a finite number in [lo, hi]. */
export function assertInRange(value: number, lo: number, hi: number, what: string): void {
  if (!Number.isFinite(value) || value < lo || value > hi) {
    throw new RangeError(`${what} must be between ${lo} and ${hi}, got ${value}`);
  }
}

/** Throws unless `value` is a finite number of at least 0. */
export function assertNonNegative(value: number, what: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${what} must be zero or more, got ${value}`);
  }
}

/** Throws unless `value` is a whole number of at least `min`. */
export function assertWhole(value: number, min: number, what: string): void {
  if (!Number.isInteger(value) || value < min) {
    throw new RangeError(`${what} must be a whole number of at least ${min}, got ${value}`);
  }
}

/** Throws unless `value` is a fraction in [0, 1]. */
export function assertFraction(value: number, what: string): void {
  assertInRange(value, 0, 1, what);
}
