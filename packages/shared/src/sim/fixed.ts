/**
 * Fixed precision for simulated values and their wire forms. Positions are kept on a 1/64 px
 * grid so client and server stay bit-identical; shared state carries them at 1/8 px.
 */
import { NET } from '../net-constants.js';

/** Stamina is kept to one decimal after every step. */
const STAMINA_SCALE = 10;

/** One packed axis holds a value below this; the other axis is multiplied by it. */
const AXIS_SPAN = 65_536;

export function quantizePos(value: number): number {
  return Math.round(value * NET.POS_SCALE_SIM) / NET.POS_SCALE_SIM;
}

export function quantizeStamina(value: number): number {
  return Math.round(value * STAMINA_SCALE) / STAMINA_SCALE;
}

function packAxis(value: number): number {
  const q = Math.round(value * NET.POS_SCALE_NET);
  if (q < 0 || q > NET.MAP_MAX_PX * NET.POS_SCALE_NET) {
    throw new RangeError(`position ${value} is outside the map range`);
  }
  return q;
}

/** Packs a position into one uint32 at 1/8 px: `xq * 65536 + yq`. */
export function packWirePos(x: number, y: number): number {
  return packAxis(x) * AXIS_SPAN + packAxis(y);
}

export function unpackWirePos(packed: number): { readonly x: number; readonly y: number } {
  const xq = Math.floor(packed / AXIS_SPAN);
  const yq = packed - xq * AXIS_SPAN;
  return { x: xq / NET.POS_SCALE_NET, y: yq / NET.POS_SCALE_NET };
}

/** Position in the whole 1/64 px units acknowledgements carry. */
export function toAckUnits(value: number): number {
  return Math.round(value * NET.POS_SCALE_SIM);
}

export function fromAckUnits(units: number): number {
  return units / NET.POS_SCALE_SIM;
}
