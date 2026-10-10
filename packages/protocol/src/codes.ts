// Numeric message codes. The numbers are part of the wire contract with every deployed client:
// never renumber or reuse a value; add new codes at the end.

/** Client → server message codes. */
export enum C2S {
  /** InputPacket */
  Input = 1,
  /** PingMsg */
  Ping = 2,
  /** CmdEnvelope: every UI and game command */
  Cmd = 3,
  /** TelemetryMsg */
  Telemetry = 4,
}

/** Server → client message codes. */
export enum S2C {
  Welcome = 1,
  Ack = 2,
  Pong = 3,
  Events = 4,
  CmdResult = 5,
  Self = 6,
  Inv = 7,
  Transfer = 8,
  Notify = 9,
  Chat = 10,
  Dialogue = 11,
  Ui = 12,
  Trade = 13,
  Party = 14,
  Clan = 15,
  World = 16,
  Markers = 17,
  Container = 18,
  Journal = 19,
  Knowledge = 20,
  Social = 21,
  Death = 22,
  ActionReject = 23,
  Kick = 24,
  FirstListening = 25,
  Rescue = 26,
}

/** WebSocket close codes the server uses when it ends a session on purpose. */
export enum CloseCode {
  Generic = 4000,
  SessionReplaced = 4001,
  Banned = 4002,
  ProtocolViolation = 4003,
  ContentMismatch = 4004,
  ServerShutdown = 4005,
  Dead = 4006,
  Transfer = 4008,
}

/** Every client → server code, in ascending order. */
export const C2S_CODES: readonly C2S[] = Object.freeze([
  C2S.Input,
  C2S.Ping,
  C2S.Cmd,
  C2S.Telemetry,
]);
