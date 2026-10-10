import { ItemRepo } from './db/repos/items';
import { ItemService } from './services/items';
import { AreaRoom } from './rooms/area-room';

export const main = (): unknown => new AreaRoom(new ItemService(new ItemRepo()));
