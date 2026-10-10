import { z } from 'zod';
import { CHANNEL_LIMITS, CHAT_LIMITS } from './limits.js';
import { CHAT_CHANNELS, type ChatChannel, type CmdArgs, type CmdOp } from './messages.js';

// Argument schemas for every command op. A new command registers its schema here (and its
// argument type in `CmdArgs`); the envelope validator never changes for it.

/** A code point takes at most two UTF-16 units, which bounds the length check cheaply. */
const MAX_UNITS_PER_CODE_POINT = 2;

/** A string whose length in characters (Unicode code points) lies in [min, max]. */
function textOfLength(min: number, max: number): z.ZodType<string> {
  return z
    .string()
    .max(max * MAX_UNITS_PER_CODE_POINT)
    .refine((text) => {
      const length = Array.from(text).length;
      return length >= min && length <= max;
    });
}

const chatText = textOfLength(CHAT_LIMITS.TEXT_MIN_CHARS, CHAT_LIMITS.TEXT_MAX_CHARS);
const characterName = textOfLength(CHAT_LIMITS.NAME_MIN_CHARS, CHAT_LIMITS.NAME_MAX_CHARS);

const OPEN_CHANNELS = CHAT_CHANNELS.filter(
  (channel): channel is Exclude<ChatChannel, 'whisper'> => channel !== 'whisper',
);

/** A whisper must name its recipient; every other channel must not. */
const chatSendArgs = z.union([
  z.strictObject({ ch: z.literal('whisper'), text: chatText, to: characterName }),
  z.strictObject({ ch: z.enum(OPEN_CHANNELS), text: chatText }),
]);

const noArgs = z.strictObject({});

const channelSwitchArgs = z.strictObject({
  channel: z.int().min(CHANNEL_LIMITS.MIN).max(CHANNEL_LIMITS.MAX),
});

/** One schema per op; the mapped type makes a missing or mistyped entry a compile error. */
const CMD_ARG_SCHEMA_TABLE: { readonly [O in CmdOp]: z.ZodType<CmdArgs[O]> } = {
  'chat.send': chatSendArgs,
  logout: noArgs,
  'channel.switch': channelSwitchArgs,
};

/** Registry of command argument schemas, keyed by op. Unknown ops have no entry. */
export type CmdArgRegistry = ReadonlyMap<string, z.ZodType>;

export const CMD_ARG_SCHEMAS: CmdArgRegistry = new Map<string, z.ZodType>(
  Object.entries(CMD_ARG_SCHEMA_TABLE),
);

/** Every registered command op. */
export const CMD_OPS: readonly CmdOp[] = Object.freeze(
  Object.keys(CMD_ARG_SCHEMA_TABLE) as CmdOp[],
);
