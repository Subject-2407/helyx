/**
 * Derived character stats: one pure function per stat, plus `deriveStats` that builds the whole
 * sheet from base stats, level and gear. Server and client both call these, so a stat is only
 * ever computed here.
 */

import { ASPECTS, type Aspect, type PartialAspectVector } from '../types/aspect.js';
import { K } from './constants.js';

/** The six base stats after Title, gear and buffs have been added to the allocated points. */
export interface CoreStats {
  readonly str: number;
  readonly dex: number;
  readonly agi: number;
  readonly vit: number;
  readonly int: number;
  readonly wis: number;
}

/** Flat and fractional bonuses from gear affixes, the Title and buffs. All default to 0. */
export interface StatBonuses {
  readonly hp?: number;
  /** Fraction applied to max health after every flat part is summed. */
  readonly hpPct?: number;
  readonly mana?: number;
  readonly atk?: number;
  readonly apw?: number;
  readonly def?: number;
  readonly crit?: number;
  readonly critDamage?: number;
  readonly attackSpeed?: number;
  /** Fraction added to the move multiplier before its cap. */
  readonly move?: number;
  readonly statusResist?: number;
  readonly carry?: number;
}

export interface DeriveStatsInput {
  readonly level: number;
  readonly stats: CoreStats;
  readonly weaponAtk?: number;
  readonly weaponApw?: number;
  /** Sum of the defense of every equipped armor piece. */
  readonly armorDef?: number;
  readonly bonus?: StatBonuses;
  /** Uncapped resist per Aspect from gear and buffs; only the listed Aspects are returned. */
  readonly aspectResistBonus?: PartialAspectVector;
}

export interface DerivedStats {
  readonly maxHp: number;
  readonly maxMana: number;
  readonly maxStamina: number;
  readonly attackPower: number;
  readonly aspectPower: number;
  readonly defense: number;
  readonly critChance: number;
  readonly critDamage: number;
  readonly attackSpeed: number;
  readonly moveSpeed: number;
  readonly statusResist: number;
  readonly carryCapacity: number;
  readonly aspectResists: PartialAspectVector;
}

function assertLevel(level: number, what: string): void {
  if (!Number.isFinite(level) || level < K.LEVEL_MIN) {
    throw new RangeError(`${what} must be at least ${K.LEVEL_MIN}, got ${level}`);
  }
}

/** Max health; the percent bonus multiplies the whole flat sum, gear health included. */
export function maxHp(vit: number, level: number, gearHp = 0, pctHp = 0): number {
  assertLevel(level, 'level');
  const flat = K.HP_BASE + K.HP_PER_VIT * vit + K.HP_PER_LEVEL * (level - K.LEVEL_MIN) + gearHp;
  return flat * (1 + pctHp);
}

export function maxMana(int: number, level: number, gearMana = 0): number {
  assertLevel(level, 'level');
  return K.MANA_BASE + K.MANA_PER_INT * int + K.MANA_PER_LEVEL * (level - K.LEVEL_MIN) + gearMana;
}

export function maxStamina(agi: number): number {
  return K.STA_BASE + K.STA_PER_AGI * agi;
}

/** Attack power: weapon attack plus strength plus flat bonuses. */
export function attackPower(weaponAtk: number, str: number, flatAtk = 0): number {
  return weaponAtk + K.ATK_PER_STR * str + flatAtk;
}

/** Aspect power: weapon aspect power plus intelligence plus flat bonuses. */
export function aspectPower(weaponApw: number, int: number, flatApw = 0): number {
  return weaponApw + K.APW_PER_INT * int + flatApw;
}

/** Defense from the summed armor, vitality and flat bonuses. */
export function defense(armorDef: number, vit: number, flatDef = 0): number {
  return armorDef + K.DEF_PER_VIT * vit + flatDef;
}

/**
 * Fraction of incoming damage removed by defense against an attacker of the given level.
 * Negative defense counts as none, so debuffs can strip protection but never divide by zero.
 */
export function damageReduction(def: number, attackerLevel: number): number {
  assertLevel(attackerLevel, 'attacker level');
  const effective = Math.max(0, def);
  const reduction = effective / (effective + K.DR_K0 + K.DR_K1 * attackerLevel);
  return Math.min(K.DR_CAP, reduction);
}

export function critChance(dex: number, affix = 0): number {
  return Math.min(K.CRIT_CAP, K.CRIT_BASE + K.CRIT_PER_DEX * dex + affix);
}

/** Damage multiplier of a critical hit. */
export function critDamage(affix = 0): number {
  return Math.min(K.CRITDMG_CAP, K.CRITDMG_BASE + affix);
}

/** Basic-attack speed multiplier; basic attack frame timings are divided by it. */
export function attackSpeed(dex: number, affix = 0): number {
  return Math.min(K.ASPD_CAP, 1 + K.ASPD_PER_DEX * dex + affix);
}

/** Move speed in px/s. */
export function moveSpeed(agi: number, affix = 0): number {
  return K.MOVE_BASE * Math.min(K.MOVE_CAP, 1 + K.MOVE_PER_AGI * agi + affix);
}

/** Resist against one Aspect from the summed gear and buff resists. */
export function aspectResist(total: number): number {
  return Math.min(K.ARES_CAP, total);
}

/** Fraction by which incoming status durations are shortened. */
export function statusResist(wis: number, affix = 0): number {
  return Math.min(K.SRES_CAP, K.SRES_PER_WIS * wis + affix);
}

export function carryCapacity(str: number, vit: number, affix = 0): number {
  return K.CARRY_BASE + K.CARRY_PER_STR * str + K.CARRY_PER_VIT * vit + affix;
}

function cappedAspectResists(bonus: PartialAspectVector): PartialAspectVector {
  const out: Partial<Record<Aspect, number>> = {};
  for (const aspect of ASPECTS) {
    const total = bonus[aspect];
    if (total !== undefined) {
      out[aspect] = aspectResist(total);
    }
  }
  return out;
}

/** The full derived stat sheet for one character. */
export function deriveStats(input: DeriveStatsInput): DerivedStats {
  const { level, stats } = input;
  const b = input.bonus ?? {};
  return {
    maxHp: maxHp(stats.vit, level, b.hp, b.hpPct),
    maxMana: maxMana(stats.int, level, b.mana),
    maxStamina: maxStamina(stats.agi),
    attackPower: attackPower(input.weaponAtk ?? 0, stats.str, b.atk),
    aspectPower: aspectPower(input.weaponApw ?? 0, stats.int, b.apw),
    defense: defense(input.armorDef ?? 0, stats.vit, b.def),
    critChance: critChance(stats.dex, b.crit),
    critDamage: critDamage(b.critDamage),
    attackSpeed: attackSpeed(stats.dex, b.attackSpeed),
    moveSpeed: moveSpeed(stats.agi, b.move),
    statusResist: statusResist(stats.wis, b.statusResist),
    carryCapacity: carryCapacity(stats.str, stats.vit, b.carry),
    aspectResists: cappedAspectResists(input.aspectResistBonus ?? {}),
  };
}
