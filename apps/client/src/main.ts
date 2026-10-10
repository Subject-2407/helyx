import * as Phaser from 'phaser';
import { DISPLAY } from './config/display.js';
import { integerZoom } from './config/integer-scale.js';
import { BootScene } from './scenes/boot-scene.js';

/** The whole-number zoom that fits the current browser window. */
function windowZoom(): number {
  return integerZoom(window.innerWidth, window.innerHeight);
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: DISPLAY.CONTAINER_ID,
  width: DISPLAY.WIDTH,
  height: DISPLAY.HEIGHT,
  backgroundColor: DISPLAY.BACKGROUND_COLOR,
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  // Phaser's own fit modes allow fractional scaling, so the zoom is managed here instead.
  scale: { mode: Phaser.Scale.NONE, zoom: windowZoom() },
  fps: { target: DISPLAY.TARGET_FPS, forceSetTimeOut: false },
  input: { mouse: { preventDefaultWheel: true } },
  scene: [BootScene],
});

window.addEventListener('resize', () => {
  const zoom = windowZoom();
  if (game.scale.zoom !== zoom) {
    game.scale.setZoom(zoom);
  }
});
