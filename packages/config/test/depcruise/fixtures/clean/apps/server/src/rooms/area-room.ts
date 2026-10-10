import type { ItemService } from '../services/items';
import { combatStep } from '../systems/combat';

export class AreaRoom {
  constructor(readonly items: ItemService) {}
  tick(): number {
    return combatStep(this.items);
  }
}
