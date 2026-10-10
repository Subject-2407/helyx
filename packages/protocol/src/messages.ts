import type { CloseCode } from './codes.js';
import type { ErrorCode } from './errors.js';
import type { Dir8 } from './vocabulary.js';

// Message shapes for the walking-skeleton subset of the contract. More messages and command ops
// join as their systems arrive. High-frequency messages are tuples; everything else is an object.

// ---------- input ----------

/** Held-state bits sampled once per sim frame. The server derives rising edges itself. */
export const Btn = Object.freeze({
  /** Hold to chain the combo or draw a bow. */
  ATTACK: 1 << 0,
  GUARD: 1 << 1,
  DASH: 1 << 2,
  /** Ability slots; holding one counts consecutive held frames. */
  SKILL1: 1 << 3,
  SKILL2: 1 << 4,
  SKILL3: 1 << 5,
  SKILL4: 1 << 6,
  /** Consumable quick slots. */
  CONS1: 1 << 7,
  CONS2: 1 << 8,
  CONS3: 1 << 9,
  CONS4: 1 << 10,
  /** Also the fishing timing press; while downed the server reads its held state. */
  INTERACT: 1 << 11,
  CAST_TOGGLE: 1 << 12,
  HOSTILE_TOGGLE: 1 << 13,
  /** Set while the player aims with the mouse instead of auto-aim. */
  AIM_MANUAL: 1 << 14,
} as const);

/** Buttons that act once per press: the server reacts to their rising edge only. */
export const EDGE_BITS =
  Btn.DASH |
  Btn.CONS1 |
  Btn.CONS2 |
  Btn.CONS3 |
  Btn.CONS4 |
  Btn.INTERACT |
  Btn.CAST_TOGGLE |
  Btn.HOSTILE_TOGGLE;

/** One 60 Hz input frame. */
export type InputFrame = [
  /** `uint32`, +1 per frame for the whole connection session, continuing across rooms. */
  seq: number,
  move: Dir8,
  /** `Btn` bitfield (held state). */
  buttons: number,
  /** `uint16` aim angle: 0 = east, increasing clockwise. */
  aim: number,
  /** `uint32` entity id picked by client auto-aim, 0 = none. The server re-validates it. */
  target: number,
];

export interface InputPacket {
  /** 1–4 frames with consecutive seqs, oldest first. */
  f: InputFrame[];
  /** `uint32` = round(viewTick × 100): the fractional server tick the client renders others at. */
  vt: number;
}

// ---------- ping and telemetry ----------

export interface PingMsg {
  /** Client monotonic time in ms. */
  c: number;
}

export interface PongMsg {
  /** The client time from the ping, echoed. */
  c: number;
  /** Server time in ms. */
  s: number;
  /** Current server tick. */
  t: number;
}

/** Sent by the client once a minute; stored only as metrics. */
export interface TelemetryMsg {
  fps50: number;
  fps95: number;
  rtt: number;
  corrections: number;
  snaps: number;
  reconnects: number;
}

// ---------- commands ----------

export type ChatChannel = 'local' | 'area' | 'trade' | 'party' | 'clan' | 'whisper';

/** Every chat channel a player can write to. */
export const CHAT_CHANNELS = Object.freeze([
  'local',
  'area',
  'trade',
  'party',
  'clan',
  'whisper',
] as const satisfies readonly ChatChannel[]);

/** A command without arguments. */
export type NoArgs = Record<string, never>;

export interface ChatSendArgs {
  ch: ChatChannel;
  text: string;
  /** Recipient character name; present exactly when `ch` is `whisper`. */
  to?: string;
}

export interface ChannelSwitchArgs {
  channel: number;
}

/** Arguments of every registered command op. */
export interface CmdArgs {
  'chat.send': ChatSendArgs;
  logout: NoArgs;
  'channel.switch': ChannelSwitchArgs;
}

export type CmdOp = keyof CmdArgs;

/** The `data` a successful command returns; `undefined` when it returns nothing. */
export interface CmdResultData {
  'chat.send': undefined;
  logout: { lingerS: number };
  'channel.switch': undefined;
}

export interface CmdEnvelope<O extends CmdOp = CmdOp> {
  /** `uint32` request id chosen by the client and echoed in the result. */
  rid: number;
  op: O;
  a: CmdArgs[O];
}

/** A validated command: the op and its arguments always match. */
export type AnyCmdEnvelope = { [O in CmdOp]: CmdEnvelope<O> }[CmdOp];

export interface CmdResultMsg {
  rid: number;
  ok: boolean;
  code?: ErrorCode;
  params?: Record<string, string | number>;
  data?: unknown;
}

// ---------- session ----------

/** Inputs of the shared game clock function. */
export interface ClockParams {
  epochMs: number;
  offsetMs: number;
  seasonLengthDays: number;
}

export interface WelcomeMsg {
  /** 0 while the character has fallen and the session spectates without an entity. */
  entityId: number;
  characterId: string;
  mapId: string;
  channel: number;
  /** Must equal the hash of the client's loaded content bundle, else the client reloads. */
  contentHash: string;
  /** Must equal the client's `PROTOCOL_VERSION`, else the client reloads. */
  protocolVersion: number;
  serverTimeMs: number;
  tick: number;
  clock: ClockParams;
}

/** Prediction acknowledgement, one per tick. */
export type AckMsg = [
  /** Last processed input seq, 0 if none yet. */
  seq: number,
  tick: number,
  /** Integer position in 1/64 px. */
  x: number,
  y: number,
  /** Remaining dash time in ms, 0 = not dashing. */
  dashMs: number,
  dashDir: Dir8,
  dashCdMs: number,
  /** Forced displacement remaining (ms) and its velocity (px/s). */
  knockMs: number,
  knockVx: number,
  knockVy: number,
  /** Stamina × 10, as an integer. */
  stamina: number,
  /** Milliseconds until stamina regeneration resumes. */
  staDelayMs: number,
  /** Base move speed × 100 px/s, without action multipliers. */
  speed: number,
  /** `MoveFlag` bitfield. */
  mflags: number,
];

/** Seat reservation as the room framework issues it; the client hands it back to join. */
export interface SeatReservation {
  sessionId: string;
  room: { roomId: string; processId: string; name: string; publicAddress?: string };
  reconnectionToken?: string;
  devMode?: boolean;
}

export type TransferReason =
  'exit' | 'door' | 'portal' | 'waystone' | 'scroll' | 'channel' | 'gm' | 'pushout';

export interface TransferMsg {
  reservation: SeatReservation;
  mapId: string;
  channel: number;
  fadeMs: 250 | 300 | 500;
  reason: TransferReason;
}

/** Sent right before the server closes the socket. `key` is an i18n key. */
export interface KickMsg {
  code: CloseCode;
  key: string;
}

// ---------- world and UI ----------

/** Text parameters for an i18n key. */
export type TextParams = Record<string, string | number>;

export interface NotifyMsg {
  kind: 'toast' | 'banner' | 'warning' | 'error' | 'modal';
  key: string;
  params?: TextParams;
}

export interface ChatSender {
  name: string;
  title?: string;
  clanTag?: string;
  entityId?: number;
}

/** Player messages carry `text`; system messages carry an i18n `key` with `params`. */
export interface ChatMsg {
  id: string;
  ch: ChatChannel | 'system';
  from?: ChatSender;
  text?: string;
  key?: string;
  params?: TextParams;
  /** Server time in ms. */
  at: number;
}

/** World broadcasts. Only the clock change exists so far; other kinds join with their systems. */
export type WorldMsg = { kind: 'clock'; offsetMs: number };
