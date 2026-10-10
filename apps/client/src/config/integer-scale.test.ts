import { describe, expect, it } from 'vitest';
import { integerZoom } from './integer-scale.js';

describe('integerZoom', () => {
  it.each([
    [1920, 1080, 4],
    [1280, 720, 2],
    [800, 600, 1],
    [2560, 1440, 5],
  ])('fits %ix%i at zoom %i', (width, height, zoom) => {
    expect(integerZoom(width, height)).toBe(zoom);
  });

  it('never goes below 1 when the viewport is smaller than the game', () => {
    expect(integerZoom(479, 269)).toBe(1);
    expect(integerZoom(0, 0)).toBe(1);
  });

  it('is limited by the tighter axis', () => {
    expect(integerZoom(3840, 540)).toBe(2);
    expect(integerZoom(480, 2160)).toBe(1);
  });

  it('only ever returns whole numbers', () => {
    expect(Number.isInteger(integerZoom(1366, 768))).toBe(true);
    expect(integerZoom(1366, 768)).toBe(2);
  });

  it('treats non-finite sizes as the minimum zoom', () => {
    expect(integerZoom(Number.NaN, 1080)).toBe(1);
    expect(integerZoom(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(1);
  });
});
