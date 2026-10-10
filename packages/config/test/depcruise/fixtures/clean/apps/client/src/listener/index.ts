import { PROTOCOL_VERSION } from '../../../../packages/protocol/src/index';
import { nextValue } from '../../../../packages/shared/src/index';
import { host } from './host-shim';

export const mount = (): unknown => [host, PROTOCOL_VERSION, nextValue(4)];
