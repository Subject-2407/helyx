/**
 * Version of the message contract. Client and server must agree on it exactly; bump it on any
 * breaking change to a message so that stale clients reload instead of misreading traffic.
 */
export const PROTOCOL_VERSION = 1;
