/**
 * Local ports for the client's dev and preview servers, the preview the browser tests start for
 * themselves, and the game server they proxy to.
 */
export const DEV_PORTS = {
  CLIENT_DEV: 5173,
  CLIENT_PREVIEW: 4173,
  CLIENT_E2E: 4174,
  GAME_SERVER: 2567,
} as const;
