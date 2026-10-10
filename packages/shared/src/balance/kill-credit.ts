/**
 * Kill credit and experience sharing: who earned a kill, how much experience each group gets,
 * how a party splits its share, and how level difference scales what a player receives.
 */
import { K, LEVEL_DIFF_XP_BANDS } from './constants.js';
import { assertNonNegative, assertWhole } from './guards.js';

export interface ContributionInput {
  /** Damage dealt to the monster. */
  readonly damage: number;
  /** Healing done on players engaged with the monster. */
  readonly healing: number;
  /** Damage blocked or absorbed from the monster. */
  readonly blocked: number;
}

/** One player's contribution to a kill. */
export function contribution(input: ContributionInput): number {
  assertNonNegative(input.damage, 'damage dealt');
  assertNonNegative(input.healing, 'healing done');
  assertNonNegative(input.blocked, 'damage blocked');
  return input.damage + K.KC_HEAL_WEIGHT * input.healing + K.KC_BLOCK_WEIGHT * input.blocked;
}

/** A party (or a solo player) and the sum of its members' contributions. */
export interface CreditGroup {
  readonly id: string;
  readonly contribution: number;
}

/**
 * Groups that earn a share: those that contributed at least a tenth of the monster's max
 * health, plus the top group whatever it contributed (the first listed wins a tie).
 */
export function eligibleGroups(groups: readonly CreditGroup[], maxHp: number): CreditGroup[] {
  let top: CreditGroup | undefined;
  for (const group of groups) {
    if (top === undefined || group.contribution > top.contribution) top = group;
  }
  return groups.filter(
    (group) => group === top || group.contribution >= K.KC_ELIGIBLE_FRAC * maxHp,
  );
}

/** Multiplier on a kill's experience for the number of eligible groups. */
export function groupPoolMult(eligibleCount: number): number {
  assertWhole(eligibleCount, 1, 'eligible group count');
  return Math.min(K.KC_GROUP_CAP, 1 + K.KC_GROUP_BONUS * (eligibleCount - 1));
}

/** The experience pool all eligible groups share. */
export function groupXpPool(xp: number, eligibleCount: number): number {
  assertNonNegative(xp, 'experience');
  return xp * groupPoolMult(eligibleCount);
}

export interface GroupShare {
  readonly id: string;
  readonly xp: number;
}

/** Splits the pool among the eligible groups by their share of the eligible contribution. */
export function splitGroupXp(xp: number, eligible: readonly CreditGroup[]): GroupShare[] {
  if (eligible.length === 0) return [];
  const pool = groupXpPool(xp, eligible.length);
  const total = eligible.reduce((all, group) => all + group.contribution, 0);
  return eligible.map((group) => ({
    id: group.id,
    xp: total > 0 ? (pool * group.contribution) / total : pool / eligible.length,
  }));
}

/** Whether a party member is close enough to the kill to share it. */
export function isInPartyRange(distanceTiles: number): boolean {
  return distanceTiles <= K.KC_PARTY_RANGE_TILES;
}

/** Whole experience each member in range receives from the group's share, split evenly. */
export function splitWithinParty(groupXp: number, membersInRange: number): number {
  assertNonNegative(groupXp, 'group experience');
  assertWhole(membersInRange, 1, 'members in range');
  return Math.floor(groupXp / membersInRange);
}

/** Experience multiplier for monster level minus player level. */
export function levelDiffXpMult(delta: number): number {
  const band = LEVEL_DIFF_XP_BANDS.find((b) => delta <= b.maxDelta);
  // The last band has no upper bound, so a finite difference always finds one.
  return band?.mult ?? 1;
}

/** Seconds the top group alone may loot, then for how long ground loot stays. */
export function lootTimings(): { readonly priorityS: number; readonly groundTtlS: number } {
  return { priorityS: K.LOOT_PRIORITY_S, groundTtlS: K.GROUND_ITEM_TTL_S };
}
