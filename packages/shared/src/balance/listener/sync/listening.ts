/**
 * Rules for characters who are not yet Listeners, and the conditions under which one becomes a
 * Listener. These predicates only answer yes or no; the server decides when to ask them.
 */
import { chance } from '../../../rng/random.js';
import type { Rng } from '../../../rng/rng.js';
import { K_LISTENER } from '../constants.js';
import { assertNonNegative } from '../../guards.js';

export interface CalmReward {
  /** Extra Mana regenerated per second while it lasts. */
  readonly manaRegen: number;
  readonly durationS: number;
}

/** What a Resonance Site gives a character who is not a Listener, instead of attunement. */
export function calmReward(): CalmReward {
  return { manaRegen: K_LISTENER.CALM_MANA_REGEN, durationS: K_LISTENER.CALM_DURATION_S };
}

export interface FlatGainRoute {
  /** Added now. */
  readonly grant: number;
  /** Held back and granted when the character becomes a Listener. */
  readonly bank: number;
}

/** Book and quest gains reach a Listener at once and are banked for anyone else. */
export function routeFlatGain(delta: number, isListener: boolean): FlatGainRoute {
  assertNonNegative(delta, 'a gain');
  return isListener ? { grant: delta, bank: 0 } : { grant: 0, bank: delta };
}

/** Whether the comprehension-bound book can be read: by its finder, or with enough attunement. */
export function isFolioLegible(isFinder: boolean, hiddenTotal: number): boolean {
  return isFinder || hiddenTotal >= K_LISTENER.LISTEN_FOLIO_SYNC;
}

export interface ExileCheck {
  readonly hiddenTotal: number;
  readonly karma: number;
  readonly coins: number;
}

/** Whether the exile can open a character's ears, and so whether the fee may be charged. */
export function canAskExile(check: ExileCheck): boolean {
  return (
    check.hiddenTotal >= K_LISTENER.LISTEN_EXILE_SYNC &&
    check.karma >= 0 &&
    check.coins >= K_LISTENER.LISTEN_EXILE_FEE
  );
}

/** Coins the exile charges. */
export function exileFee(): number {
  return K_LISTENER.LISTEN_EXILE_FEE;
}

export interface EdgeCheck {
  /** Health left after the hit. */
  readonly hpAfter: number;
  readonly maxHp: number;
  /** Zone resonance of the Aspect in question. */
  readonly resonance: number;
  /** Hidden attunement in that Aspect. */
  readonly hiddenSync: number;
  /** Whether this real day's roll has already been used. */
  readonly rolledToday: boolean;
}

/** Whether a near-fatal hit may roll for the edge trigger. */
export function edgeTriggerEligible(check: EdgeCheck): boolean {
  return (
    check.hpAfter > 0 &&
    check.hpAfter <= K_LISTENER.LISTEN_EDGE_HP * check.maxHp &&
    check.resonance >= K_LISTENER.LISTEN_EDGE_RES &&
    check.hiddenSync >= K_LISTENER.LISTEN_EDGE_SYNC &&
    !check.rolledToday
  );
}

/** The edge trigger's roll, made only when it is eligible. */
export function rollEdgeTrigger(rng: Rng): boolean {
  return chance(rng, K_LISTENER.LISTEN_EDGE_CHANCE);
}

/** Whether the hum can be heard: a high enough level inside its game-time window. */
export function canHearHum(level: number, gameHour: number): boolean {
  return (
    level >= K_LISTENER.LISTEN_HUM_MIN_LEVEL &&
    gameHour >= K_LISTENER.LISTEN_HUM_FROM_HOUR &&
    gameHour < K_LISTENER.LISTEN_HUM_TO_HOUR
  );
}

/** Seconds a character must listen at a tuning stone. */
export function stoneChannelS(): number {
  return K_LISTENER.LISTEN_STONE_CHANNEL_S;
}

/**
 * Whether meditation times (seconds, one per distinct point) complete the circuit: enough
 * points inside one window of a game day.
 */
export function isCircuitComplete(pointTimesS: readonly number[]): boolean {
  const sorted = [...pointTimesS].sort((a, b) => a - b);
  const needed = K_LISTENER.LISTEN_CIRCUIT_POINTS;
  for (let start = 0; start + needed <= sorted.length; start += 1) {
    const first = sorted[start] ?? 0;
    const last = sorted[start + needed - 1] ?? Number.POSITIVE_INFINITY;
    if (last - first <= K_LISTENER.LISTEN_CIRCUIT_S) return true;
  }
  return false;
}
