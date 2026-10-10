import * as Phaser from 'phaser';
import { DISPLAY } from '../config/display.js';
import { SCENE_KEYS } from './scene-keys.js';

/**
 * First scene to run. For now it only paints the background so the canvas is visibly
 * alive; loading the session and handing over to the next scene come later.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.BOOT });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(DISPLAY.BACKGROUND_COLOR);
  }
}
