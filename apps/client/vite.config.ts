import { defineConfig, type ProxyOptions } from 'vite';
import { DEV_PORTS } from './dev-ports.js';

const GAME_SERVER_URL = `http://localhost:${DEV_PORTS.GAME_SERVER}`;

/** Requests the game server answers; everything else is served by Vite. */
const GAME_SERVER_PATHS = ['/api', '/matchmake', '/healthz', '/readyz'] as const;

/**
 * Phaser alone is about 1.2 MB minified, above Vite's generic 500 kB warning. The real download
 * budget is measured gzipped by a separate check, so this only keeps the build log meaningful.
 */
const CHUNK_SIZE_WARNING_KB = 1300;

const proxy: Record<string, ProxyOptions> = Object.fromEntries(
  GAME_SERVER_PATHS.map((path) => [path, { target: GAME_SERVER_URL, ws: true }]),
);

export default defineConfig({
  server: {
    port: DEV_PORTS.CLIENT_DEV,
    strictPort: true,
    proxy,
  },
  preview: {
    port: DEV_PORTS.CLIENT_PREVIEW,
    strictPort: true,
    proxy,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: CHUNK_SIZE_WARNING_KB,
    rollupOptions: {
      // The engine changes far less often than game code, so it gets its own long-lived chunk.
      output: { manualChunks: { phaser: ['phaser'] } },
    },
  },
});
