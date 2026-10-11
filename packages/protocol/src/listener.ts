import type { ErrorCode } from './errors.js';

// Message codes and failure reasons that only the server and the separately loaded Listener build
// may know. This module is its own package entry point and the main entry never re-exports it, so
// the public client bundle never contains these names.

/**
 * Server → client codes handled only by the Listener build. They share the number space of `S2C`,
 * which leaves these numbers without a member.
 */
export const S2C_LISTENER = Object.freeze({
  /** Sent once, only to the character who just became a Listener. */
  FirstListening: 25,
} as const);

export type S2CListener = (typeof S2C_LISTENER)[keyof typeof S2C_LISTENER];

/** Failure reasons that may be sent only to a Listener. */
export const LISTENER_ERROR_CODES = Object.freeze([
  'sync_too_low',
  'sync_cap',
  'not_attuned',
] as const);

export type ListenerErrorCode = (typeof LISTENER_ERROR_CODES)[number];

/** What any other player receives instead of a Listener-only reason. It names nothing hidden. */
export const LISTENER_ERROR_FALLBACK = 'not_available' satisfies ErrorCode;

const LISTENER_ERROR_CODE_SET: ReadonlySet<string> = new Set(LISTENER_ERROR_CODES);

export function isListenerErrorCode(value: unknown): value is ListenerErrorCode {
  return typeof value === 'string' && LISTENER_ERROR_CODE_SET.has(value);
}

/**
 * The failure code to put on the wire for one recipient. A Listener-only reason reaches a Listener
 * unchanged; everyone else gets the neutral fallback, so a rejection never tells them more.
 */
export function wireErrorCode(
  code: ErrorCode | ListenerErrorCode,
  recipientIsListener: boolean,
): ErrorCode | ListenerErrorCode {
  if (isListenerErrorCode(code) && !recipientIsListener) {
    return LISTENER_ERROR_FALLBACK;
  }
  return code;
}
