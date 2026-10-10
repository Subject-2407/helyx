import { session } from '../state/session';

export const loadListener = async (load: () => Promise<unknown>): Promise<void> => {
  if (session.listening) await load();
};
