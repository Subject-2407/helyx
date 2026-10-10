/** Socketing: resonance crystals, their effect per host, and the anvil operations on them. */
import type { Rarity } from '../../types/items.js';
import {
  CRYSTAL_GRADES,
  CRYSTAL_UNITS,
  K,
  RARITY_TABLE,
  SOCKET_EFFECT_PER_UNIT,
  type CrystalGrade,
  type SocketHost,
} from '../constants.js';
import { assertNonNegative } from '../guards.js';

/** Effect of one crystal in a socket of the given host. */
export function socketEffect(host: SocketHost, grade: CrystalGrade): number {
  return CRYSTAL_UNITS[grade] * SOCKET_EFFECT_PER_UNIT[host];
}

/** Coins to take a crystal out intact. */
export function extractCost(units: number): number {
  assertNonNegative(units, 'crystal units');
  return Math.round(K.SOCKET_EXTRACT_COIN * units * units);
}

/** The grade three crystals of a grade combine into, or null for the top grade. */
export function combinedGrade(grade: CrystalGrade): CrystalGrade | null {
  return CRYSTAL_GRADES[CRYSTAL_GRADES.indexOf(grade) + 1] ?? null;
}

export interface CombineCost {
  readonly inputs: number;
  readonly coins: number;
}

/** What combining into the next grade costs, or null when there is no next grade. */
export function combineCost(grade: CrystalGrade): CombineCost | null {
  const next = combinedGrade(grade);
  if (next === null) return null;
  const coins = K.SOCKET_COMBINE_COIN * CRYSTAL_UNITS[next] * K.SOCKET_COMBINE_MULT;
  return { inputs: K.SOCKET_COMBINE_INPUTS, coins };
}

/** A drill adds a socket up to the rarity's maximum. */
export function canDrill(currentSockets: number, rarity: Rarity): boolean {
  return currentSockets < RARITY_TABLE[rarity].socketMax;
}
