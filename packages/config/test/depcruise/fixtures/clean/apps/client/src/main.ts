import { PROTOCOL_VERSION } from '../../../packages/protocol/src/index';
import { CONTENT_SEED } from '../../../packages/content/src/index';
import { loadListener } from './listener/load';
import { startWorld } from './scenes/world-scene';

export const start = async (): Promise<void> => {
  startWorld(PROTOCOL_VERSION + CONTENT_SEED);
  await loadListener(() => import('./listener/index'));
};
