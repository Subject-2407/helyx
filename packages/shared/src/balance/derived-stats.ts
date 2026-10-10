/**
 * Derived character stats: one pure function per stat, plus `deriveStats` that builds the whole
 * sheet from base stats, level and gear. Server and client both call these, so a stat is only
 * ever computed here.
 */

/**
 * Tuning values for the derived stats. They mirror the shared balance table key for key and
 * move there once that table exists; nothing outside this module should import them.
 */
const STAT_K = Object.freeze({
  HP_BASE: 60,
  HP_PER_VIT: 12,
  HP_PER_LEVEL: 8,
  MANA_BASE: 30,
  MANA_PER_INT: 6,
  MANA_PER_LEVEL: 2,
  STA_BASE: 100,
  STA_PER_AGI: 1,
  ATK_PER_STR: 2,
  APW_PER_INT: 2,
  DEF_PER_VIT: 0.5,
  DR_CAP: 0.75,
  DR_K0: 60,
  DR_K1: 12,
  CRIT_BASE: 0.05,
  CRIT_PER_DEX: 0.0025,
  CRIT_CAP: 0.5,
  CRITDMG_BASE: 1.5,
  CRITDMG_CAP: 3.0,
  ASPD_PER_DEX: 0.004,
  ASPD_CAP: 1.5,
  MOVE_BASE: 80,
  MOVE_PER_AGI: 0.003,
  MOVE_CAP: 1.4,
  ARES_CAP: 0.6,
  SRES_PER_WIS: 0.003,
  SRES_CAP: 0.4,
  CARRY_BASE: 40,
  CARRY_PER_STR: 2,
  CARRY_PER_VIT: 1,
  SYNC_G_INT: 50,
  SYNC_G_WIS: 40,
} as const);

/** The lowest character (or attacker) level. */
const MIN_LEVEL = 1;

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
  readonly aspectResistBonus?: Readonly<Record<string, number>>;
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
  readonly aspectResists: Readonly<Record<string, number>>;
}

function assertLevel(level: number, what: string): void {
  if (!Number.isFinite(level) || level < MIN_LEVEL) {
    throw new RangeError(`${what} must be at least ${MIN_LEVEL}, got ${level}`);
  }
}

/** Max health; the percent bonus multiplies the whole flat sum, gear health included. */
export function maxHp(vit: number, level: number, gearHp = 0, pctHp = 0): number {
  assertLevel(level, 'level');
  const flat =
    STAT_K.HP_BASE + STAT_K.HP_PER_VIT * vit + STAT_K.HP_PER_LEVEL * (level - MIN_LEVEL) + gearHp;
  return flat * (1 + pctHp);
}

export function maxMana(int: number, level: number, gearMana = 0): number {
  assertLevel(level, 'level');
  return (
    STAT_K.MANA_BASE +
    STAT_K.MANA_PER_INT * int +
    STAT_K.MANA_PER_LEVEL * (level - MIN_LEVEL) +
    gearMana
  );
}

export function maxStamina(agi: number): number {
  return STAT_K.STA_BASE + STAT_K.STA_PER_AGI * agi;
}

/** Attack power: weapon attack plus strength plus flat bonuses. */
export function attackPower(weaponAtk: number, str: number, flatAtk = 0): number {
  return weaponAtk + STAT_K.ATK_PER_STR * str + flatAtk;
}

/** Aspect power: weapon aspect power plus intelligence plus flat bonuses. */
export function aspectPower(weaponApw: number, int: number, flatApw = 0): number {
  return weaponApw + STAT_K.APW_PER_INT * int + flatApw;
}

/** Defense from the summed armor, vitality and flat bonuses. */
export function defense(armorDef: number, vit: number, flatDef = 0): number {
  return armorDef + STAT_K.DEF_PER_VIT * vit + flatDef;
}

/**
 * Fraction of incoming damage removed by defense against an attacker of the given level.
 * Negative defense counts as none, so debuffs can strip protection but never divide by zero.
 */
export function damageReduction(def: number, attackerLevel: number): number {
  assertLevel(attackerLevel, 'attacker level');
  const effective = Math.max(0, def);
  const reduction = effective / (effective + STAT_K.DR_K0 + STAT_K.DR_K1 * attackerLevel);
  return Math.min(STAT_K.DR_CAP, reduction);
}

export function critChance(dex: number, affix = 0): number {
  return Math.min(STAT_K.CRIT_CAP, STAT_K.CRIT_BASE + STAT_K.CRIT_PER_DEX * dex + affix);
}

/** Damage multiplier of a critical hit. */
export function critDamage(affix = 0): number {
  return Math.min(STAT_K.CRITDMG_CAP, STAT_K.CRITDMG_BASE + affix);
}

/** Basic-attack speed multiplier; basic attack frame timings are divided by it. */
export function attackSpeed(dex: number, affix = 0): number {
  return Math.min(STAT_K.ASPD_CAP, 1 + STAT_K.ASPD_PER_DEX * dex + affix);
}

/** Move speed in px/s. */
export function moveSpeed(agi: number, affix = 0): number {
  return STAT_K.MOVE_BASE * Math.min(STAT_K.MOVE_CAP, 1 + STAT_K.MOVE_PER_AGI * agi + affix);
}

/** Resist against one Aspect from the summed gear and buff resists. */
export function aspectResist(total: number): number {
  return Math.min(STAT_K.ARES_CAP, total);
}

/** Fraction by which incoming status durations are shortened. */
export function statusResist(wis: number, affix = 0): number {
  return Math.min(STAT_K.SRES_CAP, STAT_K.SRES_PER_WIS * wis + affix);
}

export function carryCapacity(str: number, vit: number, affix = 0): number {
  return STAT_K.CARRY_BASE + STAT_K.CARRY_PER_STR * str + STAT_K.CARRY_PER_VIT * vit + affix;
}

/**
 * Growth multiplier from intelligence and wisdom. Kept out of `deriveStats` on purpose: only
 * the hidden progression uses it, and the public client must be able to leave it out.
 */
export function syncGrowthMult(int: number, wis: number): number {
  return 1 + int / STAT_K.SYNC_G_INT + wis / STAT_K.SYNC_G_WIS;
}

function cappedAspectResists(
  bonus: Readonly<Record<string, number>>,
): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const [aspect, total] of Object.entries(bonus)) {
    out[aspect] = aspectResist(total);
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
