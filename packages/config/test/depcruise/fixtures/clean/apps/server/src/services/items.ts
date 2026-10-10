import { CONTENT_SEED } from '../../../../packages/content/src/index';
import type { ItemRepo } from '../db/repos/items';

export class ItemService {
  readonly seed = CONTENT_SEED;
  constructor(readonly repo: ItemRepo) {}
}
