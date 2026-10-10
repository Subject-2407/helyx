import { describe, expect, it } from 'vitest';
import golden from './__golden__/game-clock.json' with { type: 'json' };
import { gameTime, utcDayIndex, type GameClockConfig } from './game-clock.js';

interface ClockRow {
  name: string;
  serverNowMs: number;
  offsetMs?: number;
  seasonLengthDays?: number;
  expected: unknown;
}

const BASE: GameClockConfig = golden.config;
const ROWS: readonly ClockRow[] = golden.rows;

function configFor(row: ClockRow): GameClockConfig {
  return {
    epochMs: BASE.epochMs,
    offsetMs: row.offsetMs ?? BASE.offsetMs,
    seasonLengthDays: row.seasonLengthDays ?? BASE.seasonLengthDays,
  };
}

describe('gameTime', () => {
  it.each(ROWS)('$name', (row) => {
    expect(gameTime(row.serverNowMs, configFor(row))).toEqual(row.expected);
  });

  it('runs thirty times faster than real time', () => {
    const start = gameTime(BASE.epochMs + 5_000, BASE).gameMs;
    const later = gameTime(BASE.epochMs + 6_000, BASE).gameMs;
    expect(later - start).toBe(30_000);
  });

  it('accepts fractional server time from a client clock', () => {
    const time = gameTime(BASE.epochMs + 0.5, BASE);
    expect(time.gameMs).toBe(15);
    expect(time.hour).toBe(0);
  });

  it.each([
    ['a negative server time', -1],
    ['a non-finite server time', Number.NaN],
    ['an infinite server time', Number.POSITIVE_INFINITY],
  ])('rejects %s', (_label, serverNowMs) => {
    expect(() => gameTime(serverNowMs, BASE)).toThrow(RangeError);
  });

  it('rejects a moment before the clock epoch', () => {
    expect(() => gameTime(BASE.epochMs - 1, BASE)).toThrow(RangeError);
    expect(() => gameTime(BASE.epochMs, { ...BASE, offsetMs: -1 })).toThrow(RangeError);
  });

  it.each([
    ['a negative epoch', { ...BASE, epochMs: -1 }],
    ['a non-finite epoch', { ...BASE, epochMs: Number.NaN }],
    ['a non-finite offset', { ...BASE, offsetMs: Number.POSITIVE_INFINITY }],
    ['a zero season length', { ...BASE, seasonLengthDays: 0 }],
    ['a fractional season length', { ...BASE, seasonLengthDays: 1.5 }],
  ])('rejects a config with %s', (_label, config) => {
    expect(() => gameTime(BASE.epochMs, config)).toThrow(RangeError);
  });
});

describe('utcDayIndex', () => {
  it.each(golden.utcDays)('$name', ({ ms, expected }) => {
    expect(utcDayIndex(ms)).toBe(expected);
  });

  it.each([-1, Number.NaN, Number.NEGATIVE_INFINITY])('rejects %s', (ms) => {
    expect(() => utcDayIndex(ms)).toThrow(RangeError);
  });
});
