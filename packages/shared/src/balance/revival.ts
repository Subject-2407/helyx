/**
 * Lethal damage, the Downed state, revival, the auto-revive item, the Frayed debuff and
 * resurrection after a real death.
 */
import { K } from './constants.js';
import { assertNonNegative, assertWhole } from './guards.js';

/** What happens when a hit would take a character to 0 health. */
export type LethalOutcome = 'die' | 'autoRevive' | 'down';

export interface LethalState {
  /** The map allows no rescue (trials): death is real at once. */
  readonly noRescue: boolean;
  /** An auto-revive item sits in a consumable quick slot. */
  readonly featherArmed: boolean;
  /** The auto-revive lockout is still running. */
  readonly featherLocked: boolean;
}

export function resolveLethal(state: LethalState): LethalOutcome {
  if (state.noRescue) return 'die';
  if (state.featherArmed && !state.featherLocked) return 'autoRevive';
  return 'down';
}

/** Downed timer, shorter for each Downed state entered during the current Frayed period. */
export function downedTimerS(frayedDowns: number): number {
  assertWhole(frayedDowns, 0, 'downed count');
  return Math.max(K.DOWNED_MIN_S, K.DOWNED_S - K.DOWNED_STEP_S * frayedDowns);
}

/** Max health while Frayed. */
export function frayedMaxHp(baseMaxHp: number): number {
  assertNonNegative(baseMaxHp, 'max health');
  return Math.round(baseMaxHp * (1 + K.FRAYED_MAXHP));
}

/** Current health after max health changes: never above the new max. */
export function clampHp(hp: number, maxHp: number): number {
  return Math.min(hp, maxHp);
}

/** Multiplier on damage a Frayed character deals. */
export function frayedDamageMult(): number {
  return 1 + K.FRAYED_DMG;
}

export function frayedDamage(damage: number): number {
  assertNonNegative(damage, 'damage');
  return Math.round(damage * frayedDamageMult());
}

/** How a character comes back. */
export type ReviveSource = 'rekindle' | 'salve' | 'auto' | 'resurrect';

export interface ReviveResult {
  readonly hp: number;
  readonly staminaFrac: number;
  /** Mana fraction to set, or null when Mana is left as it was. */
  readonly manaFrac: number | null;
  readonly invulnerableS: number;
  readonly frayedS: number;
}

const HP_FRAC: Readonly<Record<ReviveSource, number>> = Object.freeze({
  rekindle: K.REVIVE_HP_FRAC,
  salve: K.SALVE_HP_FRAC,
  auto: K.AUTO_REVIVE_HP_FRAC,
  resurrect: K.RESURRECT_HP_FRAC,
});

/** Health after coming back, always a share of the max health after Frayed applies. */
export function reviveHp(frayedMax: number, source: ReviveSource): number {
  assertNonNegative(frayedMax, 'max health');
  return Math.round(frayedMax * HP_FRAC[source]);
}

/** Everything a revival sets, given the max health after Frayed applies. */
export function reviveResult(frayedMax: number, source: ReviveSource): ReviveResult {
  const hp = reviveHp(frayedMax, source);
  switch (source) {
    case 'rekindle':
    case 'salve':
      return {
        hp,
        staminaFrac: K.REVIVE_STAMINA_FRAC,
        manaFrac: null,
        invulnerableS: K.REVIVE_GRACE_S,
        frayedS: K.FRAYED_REVIVE_S,
      };
    case 'auto':
      return {
        hp,
        staminaFrac: K.REVIVE_STAMINA_FRAC,
        manaFrac: null,
        invulnerableS: K.AUTO_REVIVE_INVULN_S,
        frayedS: K.FRAYED_REVIVE_S,
      };
    case 'resurrect':
      return {
        hp,
        staminaFrac: K.RESURRECT_STAMINA_FRAC,
        manaFrac: K.RESURRECT_MANA_FRAC,
        invulnerableS: 0,
        frayedS: K.FRAYED_RESURRECT_S,
      };
  }
}

/** Frayed time left after a new revival: it restarts at full length and never stacks. */
export function refreshFrayedS(source: ReviveSource): number {
  return reviveResult(0, source).frayedS;
}

/** Whether an armed auto-revive item can trigger, given the time since the last trigger. */
export function isAutoReviveAvailable(sinceLastTriggerS: number | undefined): boolean {
  return sinceLastTriggerS === undefined || sinceLastTriggerS >= K.AUTO_REVIVE_LOCK_S;
}

/** Channels that revive, execute or resurrect, with their time and range. */
export type ChannelKind = 'rekindle' | 'salve' | 'execute' | 'second_dawn' | 'lantern';

export interface ChannelRule {
  readonly channelS: number;
  readonly rangePx: number;
}

export const CHANNEL_RULES: Readonly<Record<ChannelKind, ChannelRule>> = Object.freeze({
  rekindle: { channelS: K.REKINDLE_CHANNEL_S, rangePx: K.REVIVE_RANGE_PX },
  salve: { channelS: K.SALVE_CHANNEL_S, rangePx: K.SALVE_RANGE_PX },
  execute: { channelS: K.EXECUTE_S, rangePx: K.EXECUTE_RANGE_PX },
  second_dawn: { channelS: K.SECOND_DAWN_CHANNEL_S, rangePx: K.SECOND_DAWN_RANGE_PX },
  lantern: { channelS: K.LANTERN_CHANNEL_S, rangePx: K.LANTERN_RANGE_PX },
});

export function isInChannelRange(kind: ChannelKind, distancePx: number): boolean {
  return distancePx <= CHANNEL_RULES[kind].rangePx;
}

/** Contribution credited to whoever revives a character. */
export function reviverCredit(targetMaxHp: number): number {
  assertNonNegative(targetMaxHp, 'max health');
  return K.REVIVER_CREDIT_FRAC * targetMaxHp;
}

/** A Downed player gives up once the key has been held long enough. */
export function hasGivenUp(heldS: number): boolean {
  return heldS >= K.GIVE_UP_HOLD_S;
}

/** A Downed player may ping for help again once the cooldown has passed. */
export function canPingForHelp(sinceLastPingS: number | undefined): boolean {
  return sinceLastPingS === undefined || sinceLastPingS >= K.HELP_PING_COOLDOWN_S;
}

export interface ResurrectionWindow {
  readonly windowS: number;
  readonly consentS: number;
  /** The Remnant's lifetime, counted from the real death. */
  readonly remnantTtlS: number;
}

export function resurrectionWindow(): ResurrectionWindow {
  return {
    windowS: K.RESURRECT_WINDOW_S,
    consentS: K.RESURRECT_CONSENT_S,
    remnantTtlS: K.REMNANT_TTL_S,
  };
}
