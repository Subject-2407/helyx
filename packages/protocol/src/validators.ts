import { z } from 'zod';
import { C2S } from './codes.js';
import { CMD_ARG_SCHEMAS, type CmdArgRegistry } from './commands.js';
import { CMD_LIMITS, INPUT_LIMITS, PING_LIMITS, TELEMETRY_LIMITS } from './limits.js';
import type { AnyCmdEnvelope, InputFrame, InputPacket, PingMsg, TelemetryMsg } from './messages.js';
import { DIR8_VALUES } from './vocabulary.js';

// Validation of everything a client sends. Parsing never throws: a bad message becomes a
// rejection with a short reason the server can count, and is then dropped.

/** Validated payload type of each client → server code. */
export interface C2SPayload {
  [C2S.Input]: InputPacket;
  [C2S.Ping]: PingMsg;
  [C2S.Cmd]: AnyCmdEnvelope;
  [C2S.Telemetry]: TelemetryMsg;
}

export type C2SRejectReason = 'unknown_code' | 'invalid_payload' | 'unknown_op' | 'invalid_args';

export type ParseResult<T> = { ok: true; value: T } | { ok: false; reason: C2SRejectReason };

const inputFrame: z.ZodType<InputFrame> = z.tuple([
  z.int().min(0).max(INPUT_LIMITS.SEQ_MAX),
  z.literal(DIR8_VALUES),
  z.int().min(0).max(INPUT_LIMITS.BUTTONS_MAX),
  z.int().min(0).max(INPUT_LIMITS.AIM_MAX),
  z.int().min(0).max(INPUT_LIMITS.TARGET_MAX),
]);

function seqsAreConsecutive(frames: readonly InputFrame[]): boolean {
  const first = frames[0];
  return frames.every((frame, index) => first !== undefined && frame[0] === first[0] + index);
}

const inputPacket: z.ZodType<InputPacket> = z
  .strictObject({
    f: z.array(inputFrame).min(INPUT_LIMITS.FRAMES_MIN).max(INPUT_LIMITS.FRAMES_MAX),
    vt: z.int().min(0).max(INPUT_LIMITS.VT_MAX),
  })
  .refine((packet) => seqsAreConsecutive(packet.f));

const ping: z.ZodType<PingMsg> = z.strictObject({ c: z.number().min(PING_LIMITS.CLIENT_MS_MIN) });

const count = z.int().min(0).max(TELEMETRY_LIMITS.COUNT_MAX);
const fps = z.number().min(0).max(TELEMETRY_LIMITS.FPS_MAX);

const telemetry: z.ZodType<TelemetryMsg> = z.strictObject({
  fps50: fps,
  fps95: fps,
  rtt: z.number().min(0).max(TELEMETRY_LIMITS.RTT_MAX_MS),
  corrections: count,
  snaps: count,
  reconnects: count,
});

const cmdEnvelope = z.strictObject({
  rid: z.int().min(0).max(CMD_LIMITS.RID_MAX),
  op: z.string().max(CMD_LIMITS.OP_MAX_CHARS),
  a: z.unknown(),
});

function parseWith<T>(schema: z.ZodType<T>, payload: unknown): ParseResult<T> {
  const result = schema.safeParse(payload);
  return result.success
    ? { ok: true, value: result.data }
    : { ok: false, reason: 'invalid_payload' };
}

/** Validates a command envelope, then its arguments with the schema registered for its op. */
export function parseCmd(
  payload: unknown,
  registry: CmdArgRegistry = CMD_ARG_SCHEMAS,
): ParseResult<AnyCmdEnvelope> {
  const envelope = cmdEnvelope.safeParse(payload);
  if (!envelope.success) {
    return { ok: false, reason: 'invalid_payload' };
  }
  const argsSchema = registry.get(envelope.data.op);
  if (argsSchema === undefined) {
    return { ok: false, reason: 'unknown_op' };
  }
  const args = argsSchema.safeParse(envelope.data.a);
  if (!args.success) {
    return { ok: false, reason: 'invalid_args' };
  }
  // The registry pairs every op with the schema of its own arguments.
  const value = { rid: envelope.data.rid, op: envelope.data.op, a: args.data } as AnyCmdEnvelope;
  return { ok: true, value };
}

type AnyParser = (payload: unknown) => ParseResult<unknown>;

/** One parser per client → server code; the mapped type makes a missing code a compile error. */
const C2S_PARSERS: { readonly [C in C2S]: (payload: unknown) => ParseResult<C2SPayload[C]> } = {
  [C2S.Input]: (payload) => parseWith(inputPacket, payload),
  [C2S.Ping]: (payload) => parseWith(ping, payload),
  [C2S.Cmd]: (payload) => parseCmd(payload),
  [C2S.Telemetry]: (payload) => parseWith(telemetry, payload),
};

const PARSERS_BY_CODE: ReadonlyMap<number, AnyParser> = new Map<number, AnyParser>(
  Object.entries(C2S_PARSERS).map(([code, parser]) => [Number(code), parser]),
);

/** Validates one client message. Unknown codes and malformed payloads are rejected, never thrown. */
export function parseC2S<C extends C2S>(code: C, payload: unknown): ParseResult<C2SPayload[C]>;
export function parseC2S(code: number, payload: unknown): ParseResult<C2SPayload[C2S]>;
export function parseC2S(code: number, payload: unknown): ParseResult<unknown> {
  const parser = PARSERS_BY_CODE.get(code);
  if (parser === undefined) {
    return { ok: false, reason: 'unknown_code' };
  }
  try {
    return parser(payload);
  } catch {
    // A hostile payload (a throwing getter, a revoked proxy) must not escape as an exception.
    return { ok: false, reason: 'invalid_payload' };
  }
}

// ---------- checks that need connection state ----------

export interface InputContext {
  /** Seq of the last frame received on this connection, or null before the first one. */
  lastSeq: number | null;
  serverTick: number;
}

export type InputContextRejectReason =
  'no_frames' | 'seq_not_increasing' | 'seq_gap' | 'vt_out_of_window';

export type InputContextResult = { ok: true } | { ok: false; reason: InputContextRejectReason };

/** Smallest and largest view tick value (`vt`) accepted at a server tick. */
export function viewTickWindow(serverTick: number): { min: number; max: number } {
  return {
    min: (serverTick - INPUT_LIMITS.VT_PAST_TICKS) * INPUT_LIMITS.VT_SCALE,
    max: (serverTick + INPUT_LIMITS.VT_FUTURE_TICKS) * INPUT_LIMITS.VT_SCALE,
  };
}

/**
 * Checks a validated input packet against the connection: its first frame must directly follow
 * the last frame received (any first seq is accepted before that, including after a room change),
 * and the claimed view tick must lie in the window around the current server tick.
 */
export function checkInputContext(packet: InputPacket, context: InputContext): InputContextResult {
  const first = packet.f[0];
  if (first === undefined) {
    return { ok: false, reason: 'no_frames' };
  }
  if (context.lastSeq !== null) {
    if (first[0] <= context.lastSeq) {
      return { ok: false, reason: 'seq_not_increasing' };
    }
    if (first[0] !== context.lastSeq + 1) {
      return { ok: false, reason: 'seq_gap' };
    }
  }
  const window = viewTickWindow(context.serverTick);
  if (packet.vt < window.min || packet.vt > window.max) {
    return { ok: false, reason: 'vt_out_of_window' };
  }
  return { ok: true };
}
