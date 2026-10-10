/**
 * Network rates, precision and limits that client, server and protocol share. These are not
 * balance numbers: changing one changes the wire contract or the movement simulation.
 */
export const NET = Object.freeze({
  TICK_HZ: 20,
  TICK_MS: 50,
  SIM_HZ: 60,
  SIM_DT: 1 / 60,
  FRAMES_PER_TICK: 3,
  INPUT_SEND_EVERY_FRAMES: 2,
  /** Frames of server-side jitter allowance (100 ms). */
  INPUT_BUDGET_MAX: 6,
  /** Frames buffered per player before the oldest are dropped. */
  INPUT_QUEUE_MAX: 30,
  /** Simulated positions are multiples of 1/64 px. */
  POS_SCALE_SIM: 64,
  /** Positions in shared state are multiples of 1/8 px. */
  POS_SCALE_NET: 8,
  /** Largest map width or height in px (a uint16 at 1/8 px). */
  MAP_MAX_PX: 8191,
  INTERP_DELAY_MS: 100,
  EXTRAPOLATE_MAX_MS: 100,
  /** A remote entity that jumps further than this snaps instead of interpolating. */
  TELEPORT_SNAP_PX: 48,
  CORRECTION_EPS_PX: 1 / 64,
  CORRECTION_SNAP_PX: 32,
  /** Half-life of the visual correction error. */
  CORRECTION_DECAY_MS: 100,
  LAGCOMP_MAX_MS: 200,
  /** One second of position history per entity. */
  HISTORY_TICKS: 20,
  AOI_CELL_PX: 128,
  AOI_HALF_W_PX: 336,
  AOI_HALF_H_PX: 240,
  AOI_HYSTERESIS_PX: 32,
  AOI_MAX_ENTITIES: 120,
  PING_INTERVAL_MS: 2000,
  SEAT_RESERVATION_S: 15,
  XFER_TTL_S: 30,
  RECONNECT_SAFE_S: 15,
  LINGER_S: 30,
  LINGER_COMBAT_S: 60,
  /** Damage this recent makes a logout linger longer; separate from the combat window. */
  LINGER_COMBAT_WINDOW_S: 10,
  MAX_WS_PAYLOAD: 8192,

  /** Side of one collision cell in px. */
  COLLISION_CELL_PX: 8,
  /** Feet box: centred on the feet point, extending upward from it. */
  FEET_BOX_W_PX: 10,
  FEET_BOX_H_PX: 6,
  /** Diagonal unit component, written as a literal so every engine uses the same bits. */
  DIAG: 0.7071067811865476,
  /** Frames one input packet may carry. */
  INPUT_FRAMES_MAX: 4,
  /** How far behind and ahead of the server tick a client may claim to render. */
  INPUT_VT_PAST_TICKS: 40,
  INPUT_VT_FUTURE_TICKS: 2,
  /** The view tick travels as `round(viewTick × INPUT_VT_SCALE)`. */
  INPUT_VT_SCALE: 100,
  /** Button bits in an input frame; every button value is below 2^BUTTON_BITS. */
  BUTTON_BITS: 15,
} as const);
