import type { Archetype } from '../../types/combat.js';

/** Multipliers and fixed values a monster archetype applies to the level templates. */
export interface ArchetypeRow {
  readonly hp: number;
  readonly atk: number;
  readonly def: number;
  /** Move speed in px/s. */
  readonly speed: number;
  readonly xp: number;
  readonly coin: number;
  /** Poise; per phase for bosses. */
  readonly poise: number;
  /** Bosses wait longer before their poise refills. */
  readonly isBoss: boolean;
}

function row(
  hp: number,
  atk: number,
  def: number,
  speed: number,
  xp: number,
  coin: number,
  poise: number,
  isBoss = false,
): ArchetypeRow {
  return { hp, atk, def, speed, xp, coin, poise, isBoss };
}

/** Columns: hp, atk, def, speed, xp, coin, poise, boss. */
export const ARCHETYPE_TABLE: Readonly<Record<Archetype, ArchetypeRow>> = Object.freeze({
  fodder: row(0.6, 0.8, 0.6, 60, 0.5, 0.5, 10),
  standard: row(1, 1, 1, 64, 1, 1, 30),
  skirmisher: row(0.8, 0.9, 0.8, 90, 1, 1, 25),
  caster: row(0.7, 1.2, 0.7, 56, 1.2, 1.2, 20),
  brute: row(1.6, 1.3, 1.4, 50, 1.5, 1.5, 80),
  elite: row(4, 1.5, 1.5, 70, 5, 5, 150),
  instance_boss: row(24, 1.6, 1.6, 60, 12, 10, 300, true),
  trial_boss: row(14, 1.7, 1.6, 70, 10, 0, 250, true),
  boss: row(200, 1.8, 2, 60, 25, 20, 400, true),
});
