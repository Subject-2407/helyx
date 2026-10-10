import { describe, expect, it } from 'vitest';
import { NET } from './net-constants.js';

/** The agreed rate table, copied by hand so an accidental edit to `NET` fails here. */
const AGREED = {
  TICK_HZ: 20,
  TICK_MS: 50,
  SIM_HZ: 60,
  SIM_DT: 1 / 60,
  FRAMES_PER_TICK: 3,
  INPUT_SEND_EVERY_FRAMES: 2,
  INPUT_BUDGET_MAX: 6,
  INPUT_QUEUE_MAX: 30,
  POS_SCALE_SIM: 64,
  POS_SCALE_NET: 8,
  MAP_MAX_PX: 8191,
  INTERP_DELAY_MS: 100,
  EXTRAPOLATE_MAX_MS: 100,
  TELEPORT_SNAP_PX: 48,
  CORRECTION_EPS_PX: 1 / 64,
  CORRECTION_SNAP_PX: 32,
  CORRECTION_DECAY_MS: 100,
  LAGCOMP_MAX_MS: 200,
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
  LINGER_COMBAT_WINDOW_S: 10,
  MAX_WS_PAYLOAD: 8192,
  COLLISION_CELL_PX: 8,
  FEET_BOX_W_PX: 10,
  FEET_BOX_H_PX: 6,
  DIAG: 0.7071067811865476,
  INPUT_FRAMES_MAX: 4,
  INPUT_VT_PAST_TICKS: 40,
  INPUT_VT_FUTURE_TICKS: 2,
  INPUT_VT_SCALE: 100,
  BUTTON_BITS: 15,
};

describe('network constants', () => {
  it('match the agreed rates and limits', () => {
    expect(NET).toEqual(AGREED);
  });

  it('fit a whole number of sim frames into one tick', () => {
    expect(NET.FRAMES_PER_TICK).toBe(NET.TICK_MS / (1000 / NET.SIM_HZ));
    expect(NET.TICK_MS).toBe(1000 / NET.TICK_HZ);
  });

  it('keep the diagonal literal equal to the unit diagonal', () => {
    expect(NET.DIAG * NET.DIAG * 2).toBeCloseTo(1, 12);
  });

  it('are frozen', () => {
    expect(Object.isFrozen(NET)).toBe(true);
  });
});
