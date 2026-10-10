/** How fast attunement grows for a character. */
import { K } from '../constants.js';

/** Growth multiplier from intelligence and wisdom. */
export function syncGrowthMult(int: number, wis: number): number {
  return 1 + int / K.SYNC_G_INT + wis / K.SYNC_G_WIS;
}
