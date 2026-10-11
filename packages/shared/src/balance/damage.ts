/**
 * The damage pipeline for one hit, plus healing. The server runs it for every hit it resolves;
 * the client runs the same code without a random source to preview numbers.
 *
 * Every multiplier step is its own small function and `computeHit` applies them in a fixed
 * order. Values stay unrounded until the very last step.
 */
import type { Rng } from '../rng/rng.js';
import type { Aspect, PartialAspectVector } from '../types/aspect.js';
import type { EnchantGrade } from '../types/items.js';
import { ENCHANT_GRADES, K, STATUS_TABLE } from './constants.js';
import { counterMultiplier, type AspectProfile } from './counter.js';
import { damageReduction } from './derived-stats.js';
import { assertFraction } from './guards.js';
import { mean } from './math.js';
import { profDamageMult } from './proficiency.js';

/** Damage coefficients of one hit: a flat base plus shares of attack and aspect power. */
export interface DamageScaling {
  readonly base: number;
  readonly atk?: number;
  readonly apw?: number;
}

export interface AttackerPowers {
  readonly attackPower: number;
  readonly aspectPower: number;
}

/** Aspect resist per Aspect; missing Aspects count as 0. */
export type AspectResists = PartialAspectVector;

export interface HitInput {
  readonly damage: DamageScaling;
  readonly powers: AttackerPowers;
  /** Proficiency of the ability (1 for basic attacks). */
  readonly prof: number;
  /** Effect multiplier the caster brings to Aspect-tagged hits; ignored for untagged hits. */
  readonly effectBonus: number;
  /** Cast mode power multiplier (1 for physical hits). */
  readonly modeMult: number;
  readonly critChance: number;
  readonly critDamage: number;
  /** Damage-over-time ticks never crit. */
  readonly isDotTick?: boolean;
  /** Set to false to keep the random source for the crit roll only. Defaults to true. */
  readonly variance?: boolean;
  readonly attackerLevel: number;
  readonly attackerIsPlayer: boolean;
  readonly targetIsPlayer: boolean;
  readonly targetDef: number;
  /** Tagged portion of the hit, from `taggedPortion`. */
  readonly p: number;
  readonly tags: readonly Aspect[];
  readonly targetProfile: AspectProfile;
  readonly targetResists: AspectResists;
  /** Product of the target-side modifiers, from `targetModsMult`. Defaults to 1. */
  readonly targetMods?: number;
  /** A fully immune target takes 0 instead of the usual minimum of 1. */
  readonly immune?: boolean;
}

export interface HitResult {
  readonly damage: number;
  readonly crit: boolean;
  /** Damage before the final rounding, for tests and tooling. */
  readonly unrounded: number;
}

/** Where a hit comes from, as far as its tagged portion is concerned. */
export type DamageSource =
  | { readonly kind: 'physical' }
  | { readonly kind: 'aspect' }
  | { readonly kind: 'basic'; readonly enchantGrade?: EnchantGrade }
  | { readonly kind: 'monster'; readonly tags: readonly Aspect[]; readonly p?: number };

/** Share of a hit's damage that carries its Aspect tags. */
export function taggedPortion(source: DamageSource): number {
  switch (source.kind) {
    case 'physical':
      return 0;
    case 'aspect':
      return 1;
    case 'basic':
      return source.enchantGrade === undefined ? 0 : ENCHANT_GRADES[source.enchantGrade].p;
    case 'monster': {
      if (source.tags.length === 0) {
        return 0;
      }
      const p = source.p ?? 1;
      assertFraction(p, 'a monster tagged portion');
      return p;
    }
  }
}

/** Mean of the target's resist over the hit's tags. */
export function resistMean(resists: AspectResists, tags: readonly Aspect[]): number {
  return mean(tags.map((tag) => resists[tag] ?? 0));
}

export function rawDamage(damage: DamageScaling, powers: AttackerPowers): number {
  return (
    damage.base + (damage.atk ?? 0) * powers.attackPower + (damage.apw ?? 0) * powers.aspectPower
  );
}

export function applyProficiency(raw: number, prof: number): number {
  return raw * profDamageMult(prof);
}

/** The effect bonus only affects Aspect-tagged hits. */
export function applyEffectBonus(
  raw: number,
  effectBonus: number,
  tags: readonly Aspect[],
): number {
  return tags.length === 0 ? raw : raw * effectBonus;
}

export function applyModeMult(raw: number, modeMult: number): number {
  return raw * modeMult;
}

export function applyCrit(raw: number, crit: boolean, critDamage: number): number {
  return crit ? raw * critDamage : raw;
}

/** Fraction of the hit left after the target's defense. */
export function mitigation(targetDef: number, attackerLevel: number): number {
  return 1 - damageReduction(targetDef, attackerLevel);
}

/** Weight of the tagged share after counters and resist; 0 for an untagged hit. */
export function aspectPart(
  p: number,
  tags: readonly Aspect[],
  profile: AspectProfile,
  rbar: number,
): number {
  if (p === 0 || tags.length === 0) {
    return 0;
  }
  return p * counterMultiplier(tags, profile) * (1 - rbar);
}

/** Weight of the untagged share, which ignores counters and resist. */
export function physPart(p: number): number {
  return 1 - p;
}

export function mixParts(raw: number, mit: number, phys: number, aspect: number): number {
  return raw * mit * (phys + aspect);
}

export function applyTargetMods(dmg: number, targetMods: number): number {
  return dmg * targetMods;
}

export function applyPvpScale(
  dmg: number,
  attackerIsPlayer: boolean,
  targetIsPlayer: boolean,
): number {
  return attackerIsPlayer && targetIsPlayer ? dmg * K.PVP_SCALE : dmg;
}

/** Random spread of a hit, uniform within plus or minus the variance. */
export function varianceFactor(rng: Rng): number {
  return 1 + (2 * rng.next() - 1) * K.VAR;
}

/** Rounds the final damage; at least 1 unless the target is fully immune. */
export function finalizeDamage(dmg: number, immune: boolean): number {
  return immune ? 0 : Math.max(K.DMG_MIN, Math.round(dmg));
}

export interface TargetModsInput {
  /** The target carries `exposed`. */
  readonly exposed?: boolean;
  /** The attacker carries `weaken`. */
  readonly weakened?: boolean;
  /** Any further multipliers the caller worked out (guard, states, revival penalties). */
  readonly extra?: readonly number[];
}

/** Multiplies the target-side modifiers into one factor. */
export function targetModsMult(input: TargetModsInput): number {
  let mult = 1;
  if (input.exposed === true) {
    mult *= 1 + STATUS_TABLE.exposed.magnitude;
  }
  if (input.weakened === true) {
    mult *= 1 + STATUS_TABLE.weaken.magnitude;
  }
  for (const factor of input.extra ?? []) {
    mult *= factor;
  }
  return mult;
}

function rollCrit(input: HitInput, rng: Rng | undefined): boolean {
  if (rng === undefined || input.isDotTick === true || input.critChance <= 0) {
    return false;
  }
  return rng.next() < input.critChance;
}

/**
 * Resolves one hit. With a random source it rolls the crit and then the variance; without one
 * it never crits and uses no variance, which is what previews need.
 */
export function computeHit(input: HitInput, rng?: Rng): HitResult {
  assertFraction(input.p, 'the tagged portion');
  assertFraction(input.critChance, 'crit chance');
  let value = rawDamage(input.damage, input.powers);
  value = applyProficiency(value, input.prof);
  value = applyEffectBonus(value, input.effectBonus, input.tags);
  value = applyModeMult(value, input.modeMult);
  const crit = rollCrit(input, rng);
  value = applyCrit(value, crit, input.critDamage);
  const rbar = resistMean(input.targetResists, input.tags);
  const aspect = aspectPart(input.p, input.tags, input.targetProfile, rbar);
  value = mixParts(
    value,
    mitigation(input.targetDef, input.attackerLevel),
    physPart(input.p),
    aspect,
  );
  value = applyTargetMods(value, input.targetMods ?? 1);
  value = applyPvpScale(value, input.attackerIsPlayer, input.targetIsPlayer);
  if (rng !== undefined && input.variance !== false) {
    value *= varianceFactor(rng);
  }
  return { damage: finalizeDamage(value, input.immune === true), crit, unrounded: value };
}

export interface HealInput {
  readonly base: number;
  readonly apw: number;
  readonly aspectPower: number;
  readonly prof: number;
  readonly effectBonus: number;
  readonly modeMult: number;
  /** Only abilities that allow it can crit when healing. */
  readonly crit?: { readonly chance: number; readonly damage: number };
}

export interface HealResult {
  readonly heal: number;
  readonly crit: boolean;
}

/** Healing ignores defense, counters and resist. */
export function computeHeal(input: HealInput, rng?: Rng): HealResult {
  let value = input.base + input.apw * input.aspectPower;
  value *= profDamageMult(input.prof) * input.effectBonus * input.modeMult;
  const crit = input.crit !== undefined && rng !== undefined && rng.next() < input.crit.chance;
  if (crit && input.crit !== undefined) {
    value *= input.crit.damage;
  }
  return { heal: Math.round(value), crit };
}
