import { DISPLAY } from './display.js';

/**
 * The largest whole-number zoom at which the internal resolution still fits inside the
 * viewport. Fractional zoom would blur or unevenly stretch pixel art, so it is never used;
 * a viewport too small for even 1x still gets 1x and is simply cropped.
 */
export function integerZoom(viewportWidth: number, viewportHeight: number): number {
  const fit = Math.min(viewportWidth / DISPLAY.WIDTH, viewportHeight / DISPLAY.HEIGHT);
  if (!Number.isFinite(fit)) {
    return DISPLAY.MIN_ZOOM;
  }
  return Math.max(DISPLAY.MIN_ZOOM, Math.floor(fit));
}
