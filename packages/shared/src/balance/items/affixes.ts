/**
 * Affix ranges, rolls and picks. Affix records (coefficients, allowed slots, rarity floor)
 * are content data passed in.
 */
import { randInt } from '../../rng/random.js';
import type { Rng } from '../../rng/rng.js';
import type { Rarity } from '../../types/items.js';
import { K } from '../constants.js';
import { assertFraction, assertWhole } from '../guards.js';
import { roundTo } from '../math.js';

/** Where an item sits, as far as affix eligibility is concerned. */
export type AffixSlot = 'weapon' | 'off_hand' | 'head' | 'body' | 'hands' | 'feet' | 'accessory';

/** Flat affixes round to whole numbers; percent affixes (stored as fractions) to 0.1%. */
export type AffixKind = 'flat' | 'pct';

export interface AffixDef {
  readonly id: string;
  readonly kind: AffixKind;
  readonly slots: readonly AffixSlot[];
  /** `min = a + b × ilvl`, `max = c + d × ilvl`. */
  readonly a: number;
  readonly b: number;
  readonly c: number;
  readonly d: number;
  /** Lowest rarity that can roll this affix; 0 when any can. */
  readonly minRarity?: number;
}

export interface AffixRange {
  readonly min: number;
  readonly max: number;
}

function roundAffix(value: number, kind: AffixKind): number {
  return kind === 'flat' ? roundTo(value, 0) : roundTo(value, K.AFFIX_PCT_DECIMALS);
}

/** An affix's range at an item level, rounded by its kind. */
export function affixRange(def: AffixDef, ilvl: number): AffixRange {
  assertWhole(ilvl, K.ILVL_MIN, 'item level');
  return {
    min: roundAffix(def.a + def.b * ilvl, def.kind),
    max: roundAffix(def.c + def.d * ilvl, def.kind),
  };
}

/** Quality of a roll, uniform between the rarity's floor and 1. */
export function rollAffixQuality(floor: number, rng: Rng): number {
  assertFraction(floor, 'a roll floor');
  return floor + rng.next() * (1 - floor);
}

/** The value of an affix line at a quality, rounded by its kind. */
export function affixValue(range: AffixRange, quality: number, kind: AffixKind): number {
  assertFraction(quality, 'quality');
  return roundAffix(range.min + quality * (range.max - range.min), kind);
}

/** Whether an affix may roll on an item in a slot of a rarity. */
export function affixAllowed(def: AffixDef, slot: AffixSlot, rarity: Rarity): boolean {
  return def.slots.includes(slot) && rarity >= (def.minRarity ?? 0);
}

/**
 * Picks up to `count` different affixes allowed for the item, none of them in `exclude`
 * (the lines the item already has). Fewer come back when the pool runs out.
 */
export function pickAffixes(
  pool: readonly AffixDef[],
  slot: AffixSlot,
  rarity: Rarity,
  count: number,
  rng: Rng,
  exclude: readonly string[] = [],
): AffixDef[] {
  assertWhole(count, 0, 'affix count');
  const open = pool.filter((def) => affixAllowed(def, slot, rarity) && !exclude.includes(def.id));
  const picked: AffixDef[] = [];
  while (picked.length < count && open.length > 0) {
    const [def] = open.splice(randInt(rng, 0, open.length - 1), 1);
    if (def !== undefined) picked.push(def);
  }
  return picked;
}
