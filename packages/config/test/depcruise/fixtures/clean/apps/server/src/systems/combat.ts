import { nextValue } from '../../../../packages/shared/src/index';
import type { ItemService } from '../services/items';

export const combatStep = (items: ItemService): number => nextValue(items.seed);
