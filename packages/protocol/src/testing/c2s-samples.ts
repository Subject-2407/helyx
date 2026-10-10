import { U32_MAX } from '@helyx/shared';
import { C2S } from '../codes.js';
import { Btn } from '../messages.js';

// Hand-written valid and invalid payloads for every client message code and every command op.
// The meta-test fails when a code or op has no sample of either kind.

export interface SampleSet {
  readonly valid: Readonly<Record<string, unknown>>;
  readonly invalid: Readonly<Record<string, unknown>>;
}

const LONGEST_CHAT = 'a'.repeat(200);
/** 200 characters, each two UTF-16 units long. */
const LONGEST_CHAT_IN_EMOJI = '\u{1F600}'.repeat(200);

export const C2S_SAMPLES: Readonly<Partial<Record<number, SampleSet>>> = {
  [C2S.Input]: {
    valid: {
      'one idle frame': { f: [[1, 0, 0, 0, 0]], vt: 0 },
      'four frames at the upper bounds': {
        f: [
          [U32_MAX - 3, 8, 2 ** 15 - 1, 65535, U32_MAX],
          [U32_MAX - 2, 8, Btn.ATTACK | Btn.DASH, 65535, U32_MAX],
          [U32_MAX - 1, 1, Btn.AIM_MANUAL, 0, 0],
          [U32_MAX, 5, 0, 32768, 7],
        ],
        vt: U32_MAX,
      },
      'two walking frames': {
        f: [
          [41, 3, Btn.GUARD, 16384, 0],
          [42, 3, Btn.GUARD, 16384, 0],
        ],
        vt: 12_345,
      },
    },
    invalid: {
      'no frames': { f: [], vt: 0 },
      'five frames': { f: [1, 2, 3, 4, 5].map((seq) => [seq, 0, 0, 0, 0]), vt: 0 },
      'seqs with a gap': {
        f: [
          [5, 0, 0, 0, 0],
          [7, 0, 0, 0, 0],
        ],
        vt: 0,
      },
      'seqs in reverse': {
        f: [
          [6, 0, 0, 0, 0],
          [5, 0, 0, 0, 0],
        ],
        vt: 0,
      },
      'repeated seq': {
        f: [
          [5, 0, 0, 0, 0],
          [5, 0, 0, 0, 0],
        ],
        vt: 0,
      },
      'direction above 8': { f: [[1, 9, 0, 0, 0]], vt: 0 },
      'fractional direction': { f: [[1, 1.5, 0, 0, 0]], vt: 0 },
      'unknown button bit': { f: [[1, 0, 2 ** 15, 0, 0]], vt: 0 },
      'negative buttons': { f: [[1, 0, -1, 0, 0]], vt: 0 },
      'aim above uint16': { f: [[1, 0, 0, 65536, 0]], vt: 0 },
      'negative aim': { f: [[1, 0, 0, -1, 0]], vt: 0 },
      'fractional seq': { f: [[1.5, 0, 0, 0, 0]], vt: 0 },
      'negative seq': { f: [[-1, 0, 0, 0, 0]], vt: 0 },
      'seq above uint32': { f: [[U32_MAX + 1, 0, 0, 0, 0]], vt: 0 },
      'target above uint32': { f: [[1, 0, 0, 0, U32_MAX + 1]], vt: 0 },
      'frame with an extra field': { f: [[1, 0, 0, 0, 0, 0]], vt: 0 },
      'frame missing a field': { f: [[1, 0, 0, 0]], vt: 0 },
      'string seq': { f: [['1', 0, 0, 0, 0]], vt: 0 },
      'negative view tick': { f: [[1, 0, 0, 0, 0]], vt: -1 },
      'fractional view tick': { f: [[1, 0, 0, 0, 0]], vt: 0.5 },
      'missing view tick': { f: [[1, 0, 0, 0, 0]] },
      'extra top-level key': { f: [[1, 0, 0, 0, 0]], vt: 0, x: 1 },
      'frames as an object': { f: { 0: [1, 0, 0, 0, 0] }, vt: 0 },
      'array payload': [[1, 0, 0, 0, 0]],
      null: null,
    },
  },
  [C2S.Ping]: {
    valid: {
      'zero time': { c: 0 },
      'fractional time': { c: 1234.567 },
    },
    invalid: {
      'negative time': { c: -1 },
      'string time': { c: '1' },
      'infinite time': { c: Number.POSITIVE_INFINITY },
      'not a number': { c: Number.NaN },
      'missing time': {},
      'extra key': { c: 1, s: 2 },
      'bare number': 5,
    },
  },
  [C2S.Cmd]: {
    valid: {
      logout: { rid: 0, op: 'logout', a: {} },
      'local chat': { rid: 1, op: 'chat.send', a: { ch: 'local', text: 'hello' } },
      whisper: { rid: U32_MAX, op: 'chat.send', a: { ch: 'whisper', text: 'hi', to: 'Mira' } },
      'channel switch': { rid: 3, op: 'channel.switch', a: { channel: 2 } },
    },
    invalid: {
      'missing request id': { op: 'logout', a: {} },
      'negative request id': { rid: -1, op: 'logout', a: {} },
      'request id above uint32': { rid: U32_MAX + 1, op: 'logout', a: {} },
      'numeric op': { rid: 1, op: 7, a: {} },
      'overlong op': { rid: 1, op: 'x'.repeat(33), a: {} },
      'extra key': { rid: 1, op: 'logout', a: {}, b: 1 },
      'unknown op': { rid: 1, op: 'inv.move', a: {} },
      'arguments for another op': { rid: 1, op: 'logout', a: { channel: 2 } },
      'missing arguments': { rid: 1, op: 'channel.switch' },
      'string payload': 'logout',
    },
  },
  [C2S.Telemetry]: {
    valid: {
      'typical minute': {
        fps50: 60,
        fps95: 45.5,
        rtt: 120,
        corrections: 3,
        snaps: 0,
        reconnects: 0,
      },
      'all zero': { fps50: 0, fps95: 0, rtt: 0, corrections: 0, snaps: 0, reconnects: 0 },
    },
    invalid: {
      'negative fps': { fps50: -1, fps95: 45, rtt: 120, corrections: 0, snaps: 0, reconnects: 0 },
      'absurd fps': { fps50: 1001, fps95: 45, rtt: 120, corrections: 0, snaps: 0, reconnects: 0 },
      'round trip above a minute': {
        fps50: 60,
        fps95: 45,
        rtt: 60_001,
        corrections: 0,
        snaps: 0,
        reconnects: 0,
      },
      'fractional count': {
        fps50: 60,
        fps95: 45,
        rtt: 120,
        corrections: 0.5,
        snaps: 0,
        reconnects: 0,
      },
      'missing field': { fps50: 60, fps95: 45, rtt: 120, corrections: 0, snaps: 0 },
      'extra field': {
        fps50: 60,
        fps95: 45,
        rtt: 120,
        corrections: 0,
        snaps: 0,
        reconnects: 0,
        gpu: 'x',
      },
    },
  },
};

/** Argument samples per op; tests wrap each one in a well-formed envelope. */
export const CMD_ARG_SAMPLES: Readonly<Partial<Record<string, SampleSet>>> = {
  'chat.send': {
    valid: {
      'one character': { ch: 'area', text: 'a' },
      'longest text': { ch: 'trade', text: LONGEST_CHAT },
      'longest text in two-unit characters': { ch: 'party', text: LONGEST_CHAT_IN_EMOJI },
      'clan chat': { ch: 'clan', text: 'hello' },
      'whisper with the shortest name': { ch: 'whisper', text: 'psst', to: 'Ada' },
      'whisper with the longest name': { ch: 'whisper', text: 'psst', to: 'A'.repeat(16) },
    },
    invalid: {
      'empty text': { ch: 'local', text: '' },
      'text one character too long': { ch: 'local', text: `${LONGEST_CHAT}a` },
      'emoji text one character too long': { ch: 'local', text: `${LONGEST_CHAT_IN_EMOJI}a` },
      'unknown channel': { ch: 'system', text: 'hi' },
      'whisper without a recipient': { ch: 'whisper', text: 'hi' },
      'recipient on an open channel': { ch: 'local', text: 'hi', to: 'Mira' },
      'recipient name too short': { ch: 'whisper', text: 'hi', to: 'Al' },
      'recipient name too long': { ch: 'whisper', text: 'hi', to: 'A'.repeat(17) },
      'numeric text': { ch: 'local', text: 5 },
      'extra key': { ch: 'local', text: 'hi', color: 'red' },
    },
  },
  logout: {
    valid: { 'empty object': {} },
    invalid: {
      'extra key': { now: true },
      missing: undefined,
      null: null,
    },
  },
  'channel.switch': {
    valid: {
      'first channel': { channel: 1 },
      'last channel': { channel: 255 },
    },
    invalid: {
      'channel zero': { channel: 0 },
      'channel above range': { channel: 256 },
      'fractional channel': { channel: 1.5 },
      'string channel': { channel: '2' },
      'missing channel': {},
    },
  },
};
