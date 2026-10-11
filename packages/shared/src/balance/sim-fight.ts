/**
 * A headless fight simulator for balance checks: an attacker repeats a basic-attack pattern
 * against a target until it dies. Every hit goes through the shared damage pipeline, so the
 * numbers match what the server would resolve. Patterns arrive as data; nothing here reads
 * content.
 */
import type { Rng } from '../rng/rng.js';
import { K } from './constants.js';
import { computeHit, type HitInput } from './damage.js';
import { assertNonNegative } from './guards.js';

/** One swing of a basic-attack combo; times in seconds at attack speed 1. */
export interface PatternHit {
  readonly mult: number;
  readonly windup: number;
  readonly active: number;
  readonly recovery: number;
}

export interface AttackPattern {
  readonly hits: readonly PatternHit[];
  /** Extra speed factor of the style (fists), 1 when absent. */
  readonly speedFactor?: number;
}

export interface FightAttacker {
  readonly level: number;
  /** Attack power, or aspect power for patterns that scale with it. */
  readonly power: number;
  readonly attackSpeed: number;
  readonly pattern: AttackPattern;
  readonly critChance?: number;
  readonly critDamage?: number;
}

export interface FightTarget {
  readonly hp: number;
  readonly def: number;
  readonly level: number;
}

export interface FightOptions {
  readonly crit: boolean;
  readonly variance: boolean;
  /** Required when crit or variance is on. */
  readonly rng?: Rng;
}

export interface FightResult {
  readonly hitsToKill: number;
  readonly ttkS: number;
  /** Damage of each swing of the first combo. */
  readonly perHitDamage: readonly number[];
}

/** No fight should take longer than this many swings; it guards against a target that never dies. */
const MAX_SWINGS = 10_000;

/** Attack speed the pattern runs at: the attacker's speed times the style factor, capped. */
export function effectiveAttackSpeed(attackSpeed: number, pattern: AttackPattern): number {
  if (!(attackSpeed > 0)) {
    throw new RangeError(`attack speed must be positive, got ${attackSpeed}`);
  }
  return Math.min(K.ASPD_CAP, attackSpeed * (pattern.speedFactor ?? 1));
}

/** Seconds one swing takes at the effective attack speed. */
export function swingTimeS(hit: PatternHit, speed: number): number {
  return (hit.windup + hit.active + hit.recovery) / speed;
}

/** Seconds one full combo takes. */
export function comboTimeS(pattern: AttackPattern, attackSpeed: number): number {
  const speed = effectiveAttackSpeed(attackSpeed, pattern);
  return pattern.hits.reduce((total, hit) => total + swingTimeS(hit, speed), 0);
}

function hitInput(
  attacker: FightAttacker,
  hit: PatternHit,
  target: FightTarget,
  o: FightOptions,
): HitInput {
  return {
    damage: { base: 0, atk: hit.mult },
    powers: { attackPower: attacker.power, aspectPower: 0 },
    prof: 1,
    effectBonus: 1,
    modeMult: 1,
    critChance: o.crit ? (attacker.critChance ?? 0) : 0,
    critDamage: attacker.critDamage ?? K.CRITDMG_BASE,
    variance: o.variance,
    attackerLevel: attacker.level,
    attackerIsPlayer: true,
    targetIsPlayer: false,
    targetDef: target.def,
    p: 0,
    tags: [],
    targetProfile: {},
    targetResists: {},
  };
}

/** Repeats the attacker's combo until the target's health is gone. */
export function simulateFight(
  attacker: FightAttacker,
  target: FightTarget,
  options: FightOptions,
): FightResult {
  const { hits } = attacker.pattern;
  if (hits.length === 0) throw new RangeError('a pattern needs at least one hit');
  assertNonNegative(target.hp, 'target health');
  if ((options.crit || options.variance) && options.rng === undefined) {
    throw new RangeError('crit and variance need a random source');
  }
  const rng = options.crit || options.variance ? options.rng : undefined;
  const speed = effectiveAttackSpeed(attacker.attackSpeed, attacker.pattern);
  const perHitDamage: number[] = [];
  let hp = target.hp;
  let swings = 0;
  let ttkS = 0;
  while (hp > 0 && swings < MAX_SWINGS) {
    const hit = hits[swings % hits.length] as PatternHit;
    const damage = computeHit(hitInput(attacker, hit, target, options), rng).damage;
    if (swings < hits.length) perHitDamage.push(damage);
    hp -= damage;
    ttkS += swingTimeS(hit, speed);
    swings += 1;
  }
  return { hitsToKill: swings, ttkS, perHitDamage };
}

/** Sustained basic damage per second before mitigation: combo damage over combo time. */
export function comboDpsBeforeMitigation(
  pattern: AttackPattern,
  power: number,
  attackSpeed: number,
): number {
  const mult = pattern.hits.reduce((total, hit) => total + hit.mult, 0);
  return (mult * power) / comboTimeS(pattern, attackSpeed);
}

/** Sustained basic damage per second against a target, from the pipeline's rounded hits. */
export function basicDps(
  pattern: AttackPattern,
  power: number,
  attackSpeed: number,
  target: FightTarget,
  attackerLevel: number,
): number {
  const attacker: FightAttacker = { level: attackerLevel, power, attackSpeed, pattern };
  const options: FightOptions = { crit: false, variance: false };
  const damage = pattern.hits.reduce(
    (total, hit) => total + computeHit(hitInput(attacker, hit, target, options)).damage,
    0,
  );
  return damage / comboTimeS(pattern, attackSpeed);
}
