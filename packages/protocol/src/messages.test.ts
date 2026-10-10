import { describe, expect, expectTypeOf, it } from 'vitest';
import { CHANNEL_LIMITS, CHAT_LIMITS, INPUT_LIMITS } from './limits.js';
import {
  Btn,
  CHAT_CHANNELS,
  EDGE_BITS,
  type AckMsg,
  type ChatChannel,
  type InputFrame,
  type WorldMsg,
} from './messages.js';
import { DIR8_VALUES, MoveFlag, type Dir8 } from './vocabulary.js';

describe('buttons', () => {
  const bits = Object.values(Btn);

  it('every button is one distinct bit below the button bit count', () => {
    expect(bits).toHaveLength(INPUT_LIMITS.BUTTON_BITS);
    expect(bits.map((bit) => Math.log2(bit)).sort((a, b) => a - b)).toEqual(
      Array.from({ length: INPUT_LIMITS.BUTTON_BITS }, (_, index) => index),
    );
  });

  it('all buttons together give the largest accepted bitfield', () => {
    expect(bits.reduce((all, bit) => all | bit, 0)).toBe(INPUT_LIMITS.BUTTONS_MAX);
    expect(INPUT_LIMITS.BUTTONS_MAX).toBe(2 ** 15 - 1);
  });

  it('press-once buttons are dash, the four quick slots, interact and the two toggles', () => {
    const edgeButtons = Object.entries(Btn)
      .filter(([, bit]) => (EDGE_BITS & bit) !== 0)
      .map(([name]) => name);
    expect(edgeButtons).toEqual([
      'DASH',
      'CONS1',
      'CONS2',
      'CONS3',
      'CONS4',
      'INTERACT',
      'CAST_TOGGLE',
      'HOSTILE_TOGGLE',
    ]);
  });
});

describe('movement vocabulary', () => {
  it('directions run from 0 (none) to 8', () => {
    expect(DIR8_VALUES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(Math.max(...DIR8_VALUES)).toBe(INPUT_LIMITS.MOVE_MAX);
    expectTypeOf<(typeof DIR8_VALUES)[number]>().toEqualTypeOf<Dir8>();
  });

  it('movement flags have their contract values', () => {
    expect(MoveFlag).toEqual({
      ROOTED: 1,
      STUNNED: 2,
      NO_DASH: 4,
      IMMOBILE: 8,
      TRANSIT: 16,
      DEAD: 32,
      DOWNED: 64,
    });
  });
});

describe('message shapes', () => {
  it('an input frame has five fields and an ack fourteen', () => {
    expectTypeOf<InputFrame['length']>().toEqualTypeOf<5>();
    expectTypeOf<AckMsg['length']>().toEqualTypeOf<14>();
  });

  it('lists every chat channel a player can write to', () => {
    expect(CHAT_CHANNELS).toEqual(['local', 'area', 'trade', 'party', 'clan', 'whisper']);
    expectTypeOf<(typeof CHAT_CHANNELS)[number]>().toEqualTypeOf<ChatChannel>();
  });

  it('world messages carry clock changes', () => {
    const message: WorldMsg = { kind: 'clock', offsetMs: 3_600_000 };
    expect(message.kind).toBe('clock');
  });
});

describe('limits', () => {
  it('match the message contract', () => {
    expect(INPUT_LIMITS).toMatchObject({
      FRAMES_MIN: 1,
      FRAMES_MAX: 4,
      AIM_MAX: 65_535,
      VT_SCALE: 100,
      VT_PAST_TICKS: 40,
      VT_FUTURE_TICKS: 2,
    });
    expect(CHAT_LIMITS).toMatchObject({ TEXT_MIN_CHARS: 1, TEXT_MAX_CHARS: 200 });
    expect(CHANNEL_LIMITS.MIN).toBe(1);
  });
});
