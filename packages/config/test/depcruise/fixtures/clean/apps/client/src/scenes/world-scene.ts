import { session } from '../state/session';
import { bridge } from '../ui/bridge';

export const startWorld = (seed: number): unknown => [session, bridge, seed];
