/**
 * Karma and player-combat flags. Each karma event has its own rule in a registry, so a new
 * event is added by registering a rule rather than by editing a switch. Lawless zones skip
 * karma, flags and the level bracket entirely.
 */
import type { PvpFlag, PvpTier } from '../types/world.js';
import { K } from './constants.js';
import { assertWhole } from './guards.js';
import { clamp } from './math.js';

export type KarmaEventKind =
  | 'damage_innocent'
  | 'kill_innocent'
  | 'assist_flagged'
  | 'kill_flagged'
  | 'monster_kill'
  | 'quest_complete'
  | 'atonement';

export interface KarmaContext {
  readonly karma: number;
  readonly level: number;
  readonly zone: PvpTier;
  /** For monster kills. */
  readonly monsterLevel?: number;
  /** For kills of a player: the victim's flag and level. */
  readonly victimFlag?: PvpFlag;
  readonly victimLevel?: number;
}

export interface KarmaOutcome {
  readonly delta: number;
  /** The actor becomes (or stays) an Aggressor, restarting the timer. */
  readonly aggressor: boolean;
  /** Coins paid for killing an Outlaw, 0 otherwise. */
  readonly bounty: number;
}

export type KarmaRule = (ctx: KarmaContext) => KarmaOutcome;

const NOTHING: KarmaOutcome = Object.freeze({ delta: 0, aggressor: false, bounty: 0 });

function onlyWhileNegative(ctx: KarmaContext, delta: number): KarmaOutcome {
  return ctx.karma < 0 ? { ...NOTHING, delta } : NOTHING;
}

export const DEFAULT_KARMA_RULES: ReadonlyMap<KarmaEventKind, KarmaRule> = new Map<
  KarmaEventKind,
  KarmaRule
>([
  ['damage_innocent', () => ({ ...NOTHING, aggressor: true })],
  ['kill_innocent', () => ({ ...NOTHING, delta: K.KARMA_KILL_INNOCENT, aggressor: true })],
  ['assist_flagged', () => ({ ...NOTHING, aggressor: true })],
  [
    'kill_flagged',
    (ctx) => ({
      ...NOTHING,
      bounty: ctx.victimFlag === 'outlaw' ? outlawBounty(ctx.victimLevel ?? K.LEVEL_MIN) : 0,
    }),
  ],
  [
    'monster_kill',
    (ctx) =>
      (ctx.monsterLevel ?? 0) >= ctx.level - K.KARMA_MONSTER_LEVEL_WINDOW
        ? onlyWhileNegative(ctx, K.KARMA_MONSTER_KILL)
        : NOTHING,
  ],
  ['quest_complete', (ctx) => onlyWhileNegative(ctx, K.KARMA_QUEST)],
  ['atonement', () => ({ ...NOTHING, delta: K.KARMA_ATONEMENT })],
]);

/** Karma events that only exist between players, and so do nothing in lawless zones. */
const PLAYER_EVENTS: ReadonlySet<KarmaEventKind> = new Set<KarmaEventKind>([
  'damage_innocent',
  'kill_innocent',
  'assist_flagged',
]);

/** What a karma event does to the actor. */
export function karmaDelta(
  kind: KarmaEventKind,
  ctx: KarmaContext,
  rules: ReadonlyMap<KarmaEventKind, KarmaRule> = DEFAULT_KARMA_RULES,
): KarmaOutcome {
  if (ctx.zone === 'lawless' && PLAYER_EVENTS.has(kind)) {
    return NOTHING;
  }
  const rule = rules.get(kind);
  if (rule === undefined) {
    throw new RangeError(`no karma rule is registered for ${kind}`);
  }
  return rule(ctx);
}

/** Applies a change, keeping karma inside its range. */
export function applyKarma(karma: number, delta: number): number {
  return clamp(karma + delta, K.KARMA_MIN, K.KARMA_MAX);
}

/** The flag a character shows: Outlaw by karma, Aggressor while its timer runs, else Innocent. */
export function pvpFlagFor(karma: number, aggressorUntilS: number, nowS: number): PvpFlag {
  if (karma <= K.KARMA_OUTLAW) return 'outlaw';
  return nowS < aggressorUntilS ? 'aggressor' : 'innocent';
}

/** When an Aggressor flag set now runs out. */
export function aggressorUntil(nowS: number): number {
  return nowS + K.KARMA_AGGRESSOR_S;
}

/** Whether an attacker may damage a player in a contested zone. */
export function canDamageInContested(
  attackerLevel: number,
  victimLevel: number,
  victimFlag: PvpFlag,
): boolean {
  if (victimFlag !== 'innocent') return true;
  return Math.abs(attackerLevel - victimLevel) <= K.KARMA_BRACKET;
}

/** Whether a player may damage another in a zone of the given tier. */
export function canDamagePlayer(
  zone: PvpTier,
  attackerLevel: number,
  victimLevel: number,
  victimFlag: PvpFlag,
): boolean {
  if (zone === 'safe') return false;
  if (zone === 'lawless') return true;
  return canDamageInContested(attackerLevel, victimLevel, victimFlag);
}

/** Coins one atonement payment costs at a level; each payment restores a fixed karma step. */
export function atonementCost(level: number): number {
  assertWhole(level, K.LEVEL_MIN, 'level');
  return K.KARMA_ATONEMENT_PER_LEVEL * level;
}

/** Coins paid for killing an Outlaw of a level. */
export function outlawBounty(level: number): number {
  assertWhole(level, K.LEVEL_MIN, 'level');
  return K.KARMA_BOUNTY_PER_LEVEL * level;
}

/** A bounty on one target is paid at most once per cooldown. */
export function isBountyAvailable(sinceLastPaidS: number | undefined): boolean {
  return sinceLastPaidS === undefined || sinceLastPaidS >= K.KARMA_BOUNTY_COOLDOWN_S;
}
