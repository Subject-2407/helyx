import { expect, test, type Page } from '@playwright/test';
import { DISPLAY } from '../src/config/display.js';

interface CanvasSize {
  backingWidth: number;
  backingHeight: number;
  cssWidth: number;
  cssHeight: number;
}

/** The first load of the engine bundle can take several seconds in a cold browser. */
const FIRST_LOAD_TIMEOUT_MS = 15_000;

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

async function canvasSize(page: Page): Promise<CanvasSize> {
  return page.locator('canvas').evaluate((element) => {
    const canvas = element as HTMLCanvasElement;
    const box = canvas.getBoundingClientRect();
    return {
      backingWidth: canvas.width,
      backingHeight: canvas.height,
      cssWidth: box.width,
      cssHeight: box.height,
    };
  });
}

/** The zoom the page is displaying at, or NaN when width and height disagree. */
function displayedZoom(size: CanvasSize): number {
  const zoomX = size.cssWidth / DISPLAY.WIDTH;
  const zoomY = size.cssHeight / DISPLAY.HEIGHT;
  return zoomX === zoomY ? zoomX : Number.NaN;
}

test('loads a single blank canvas at the internal resolution without errors', async ({ page }) => {
  const errors = collectErrors(page);

  await page.goto('/');
  await expect(page.locator('canvas')).toHaveCount(1, { timeout: FIRST_LOAD_TIMEOUT_MS });

  const size = await canvasSize(page);
  expect(size.backingWidth).toBe(DISPLAY.WIDTH);
  expect(size.backingHeight).toBe(DISPLAY.HEIGHT);

  const zoom = displayedZoom(size);
  expect(Number.isInteger(zoom)).toBe(true);
  expect(zoom).toBeGreaterThanOrEqual(DISPLAY.MIN_ZOOM);

  expect(await page.locator('body').innerText()).toBe('');
  expect(errors).toEqual([]);
});

test('keeps whole-number scaling when the window is resized', async ({ page }) => {
  const errors = collectErrors(page);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect
    .poll(async () => displayedZoom(await canvasSize(page)), { timeout: FIRST_LOAD_TIMEOUT_MS })
    .toBe(2);

  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect.poll(async () => displayedZoom(await canvasSize(page))).toBe(4);

  await page.setViewportSize({ width: 800, height: 600 });
  await expect.poll(async () => displayedZoom(await canvasSize(page))).toBe(1);

  expect(errors).toEqual([]);
});
