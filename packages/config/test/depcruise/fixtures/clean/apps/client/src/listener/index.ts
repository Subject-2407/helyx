import { PROTOCOL_VERSION } from '../../../../packages/protocol/src/index';
import { S2C_LISTENER } from '../../../../packages/protocol/src/listener';
import { nextValue } from '../../../../packages/shared/src/index';
import { host } from './host-shim';

export const mount = (): unknown => [host, PROTOCOL_VERSION, S2C_LISTENER, nextValue(4)];
