/**
 * The fixed internal resolution the game renders at. Every frame is drawn at this size
 * and then scaled up by a whole number so pixel art stays crisp.
 */
export const DISPLAY = {
  WIDTH: 480,
  HEIGHT: 270,
  /** Never draw smaller than one game pixel per screen pixel. */
  MIN_ZOOM: 1,
  /** Colour behind the world and in the letterbox around the canvas. */
  BACKGROUND_COLOR: '#000000',
  TARGET_FPS: 60,
  /** Id of the page element the canvas is mounted into. */
  CONTAINER_ID: 'game',
} as const;
