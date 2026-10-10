import { createDb } from '../../../../../packages/db/src/index';

export class ItemRepo {
  readonly db = createDb();
}
