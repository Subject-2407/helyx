import { U32_MAX } from '@helyx/shared';

// Bounds the validators enforce on client messages. Anything outside them is rejected and counted.

/** Number of button bits in an input frame; every button value is below 2^BUTTON_BITS. */
const BUTTON_BITS = 15;

/** Largest `uint16`, the range of a wire aim angle. */
const U16_MAX = 0xffff;

export const INPUT_LIMITS = Object.freeze({
  /** Frames per input packet. */
  FRAMES_MIN: 1,
  FRAMES_MAX: 4,
  /** Frame sequence numbers and target entity ids are `uint32`. */
  SEQ_MAX: U32_MAX,
  TARGET_MAX: U32_MAX,
  /** Largest movement direction value (south-east). */
  MOVE_MAX: 8,
  BUTTON_BITS,
  /** Largest button bitfield: all button bits set. */
  BUTTONS_MAX: 2 ** BUTTON_BITS - 1,
  /** Aim angle as a `uint16` fraction of a full turn. */
  AIM_MAX: U16_MAX,
  /** The view tick travels as `round(viewTick × VT_SCALE)` in a `uint32`. */
  VT_SCALE: 100,
  VT_MAX: U32_MAX,
  /** How far behind and ahead of the server tick a client may claim to be rendering. */
  VT_PAST_TICKS: 40,
  VT_FUTURE_TICKS: 2,
} as const);

export const CMD_LIMITS = Object.freeze({
  /** Client-chosen request id, echoed in the result. */
  RID_MAX: U32_MAX,
  /** Longest command name; longer names cannot belong to any registered command. */
  OP_MAX_CHARS: 32,
} as const);

export const CHAT_LIMITS = Object.freeze({
  /** Chat text length in characters (Unicode code points). */
  TEXT_MIN_CHARS: 1,
  TEXT_MAX_CHARS: 200,
  /** Whisper recipients are addressed by character name. */
  NAME_MIN_CHARS: 3,
  NAME_MAX_CHARS: 16,
} as const);

export const CHANNEL_LIMITS = Object.freeze({
  /** Channel numbers start at 1; the upper bound keeps the value inside one byte. */
  MIN: 1,
  MAX: 255,
} as const);

export const TELEMETRY_LIMITS = Object.freeze({
  FPS_MAX: 1000,
  /** One minute: anything slower is a broken measurement, not a round trip. */
  RTT_MAX_MS: 60_000,
  COUNT_MAX: U32_MAX,
} as const);

export const PING_LIMITS = Object.freeze({
  /** The client timestamp is a monotonic millisecond reading; it is never negative. */
  CLIENT_MS_MIN: 0,
} as const);
