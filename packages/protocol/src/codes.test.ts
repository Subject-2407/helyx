import { describe, expect, it } from 'vitest';
import { C2S, C2S_CODES, CloseCode, S2C } from './codes.js';
import { PROTOCOL_VERSION } from './version.js';

// The numbers are what deployed clients and servers exchange, so each one is pinned here.

function numericMembers(enumObject: Record<string, string | number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(enumObject).filter((entry): entry is [string, number] => {
      return typeof entry[1] === 'number';
    }),
  );
}

describe('message codes', () => {
  it('client to server codes have their contract values', () => {
    expect(numericMembers(C2S)).toEqual({ Input: 1, Ping: 2, Cmd: 3, Telemetry: 4 });
    expect(C2S_CODES).toEqual([1, 2, 3, 4]);
  });

  it('server to client codes have their contract values', () => {
    expect(numericMembers(S2C)).toEqual({
      Welcome: 1,
      Ack: 2,
      Pong: 3,
      Events: 4,
      CmdResult: 5,
      Self: 6,
      Inv: 7,
      Transfer: 8,
      Notify: 9,
      Chat: 10,
      Dialogue: 11,
      Ui: 12,
      Trade: 13,
      Party: 14,
      Clan: 15,
      World: 16,
      Markers: 17,
      Container: 18,
      Journal: 19,
      Knowledge: 20,
      Social: 21,
      Death: 22,
      ActionReject: 23,
      Kick: 24,
      Rescue: 26,
    });
  });

  it('close codes have their contract values', () => {
    expect(numericMembers(CloseCode)).toEqual({
      Generic: 4000,
      SessionReplaced: 4001,
      Banned: 4002,
      ProtocolViolation: 4003,
      ContentMismatch: 4004,
      ServerShutdown: 4005,
      Dead: 4006,
      Transfer: 4008,
    });
  });

  it('no two codes in one direction share a value', () => {
    for (const enumObject of [C2S, S2C, CloseCode]) {
      const values = Object.values(numericMembers(enumObject));
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('the protocol version starts at 1', () => {
    expect(PROTOCOL_VERSION).toBe(1);
  });
});
