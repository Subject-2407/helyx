// Machine-readable failure reasons sent in command results and action rejections. The client maps
// each one to a translated message; the server never sends display text for them.

export type ErrorCode =
  | 'invalid'
  | 'rate_limited'
  | 'internal'
  | 'not_found'
  | 'stale'
  | 'busy'
  | 'too_far'
  | 'no_los'
  | 'in_combat'
  | 'cooldown'
  | 'dead'
  | 'transit'
  | 'requirements_not_met'
  | 'level_too_low'
  | 'stat_too_low'
  | 'sync_too_low'
  | 'weapon_mismatch'
  | 'insufficient_coins'
  | 'insufficient_items'
  | 'insufficient_resource'
  | 'inventory_full'
  | 'overweight'
  | 'slot_occupied'
  | 'not_owner'
  | 'item_locked'
  | 'shop_closed'
  | 'out_of_stock'
  | 'max_listings'
  | 'price_changed'
  | 'listing_gone'
  | 'not_in_party'
  | 'party_full'
  | 'not_leader'
  | 'clan_rank'
  | 'clan_full'
  | 'name_taken'
  | 'forbidden_zone'
  | 'outlaw'
  | 'muted'
  | 'blocked'
  | 'target_busy'
  | 'server_full'
  | 'upgrade_max'
  | 'no_socket'
  | 'socket_full'
  | 'trait_locked'
  | 'already_known'
  | 'sync_cap'
  | 'daily_done'
  | 'not_attuned'
  | 'gm_only'
  | 'downed'
  | 'fallen'
  | 'not_downed'
  | 'no_rescue'
  | 'rescue_busy'
  | 'not_executable'
  | 'target_offline'
  | 'consent_declined'
  | 'consent_timeout'
  | 'window_closed'
  | 'window_closing'
  | 'illegal_offhand'
  | 'two_handed_lock'
  | 'wrong_slot'
  | 'character_exists';

/** Every `ErrorCode`, in declaration order. A test keeps this list and the union identical. */
export const ERROR_CODES = Object.freeze([
  'invalid',
  'rate_limited',
  'internal',
  'not_found',
  'stale',
  'busy',
  'too_far',
  'no_los',
  'in_combat',
  'cooldown',
  'dead',
  'transit',
  'requirements_not_met',
  'level_too_low',
  'stat_too_low',
  'sync_too_low',
  'weapon_mismatch',
  'insufficient_coins',
  'insufficient_items',
  'insufficient_resource',
  'inventory_full',
  'overweight',
  'slot_occupied',
  'not_owner',
  'item_locked',
  'shop_closed',
  'out_of_stock',
  'max_listings',
  'price_changed',
  'listing_gone',
  'not_in_party',
  'party_full',
  'not_leader',
  'clan_rank',
  'clan_full',
  'name_taken',
  'forbidden_zone',
  'outlaw',
  'muted',
  'blocked',
  'target_busy',
  'server_full',
  'upgrade_max',
  'no_socket',
  'socket_full',
  'trait_locked',
  'already_known',
  'sync_cap',
  'daily_done',
  'not_attuned',
  'gm_only',
  'downed',
  'fallen',
  'not_downed',
  'no_rescue',
  'rescue_busy',
  'not_executable',
  'target_offline',
  'consent_declined',
  'consent_timeout',
  'window_closed',
  'window_closing',
  'illegal_offhand',
  'two_handed_lock',
  'wrong_slot',
  'character_exists',
] as const satisfies readonly ErrorCode[]);

const ERROR_CODE_SET: ReadonlySet<string> = new Set(ERROR_CODES);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && ERROR_CODE_SET.has(value);
}
