import { describe, expect, expectTypeOf, it } from 'vitest';
import { ERROR_CODES, isErrorCode, type ErrorCode } from './errors.js';

/**
 * One entry per member of the union. The type annotation makes a missing member and an unknown
 * member both compile errors, so the runtime comparison below checks the list against the union.
 */
const EVERY_ERROR_CODE: Record<ErrorCode, true> = {
  invalid: true,
  rate_limited: true,
  internal: true,
  not_found: true,
  stale: true,
  busy: true,
  too_far: true,
  no_los: true,
  in_combat: true,
  cooldown: true,
  dead: true,
  transit: true,
  requirements_not_met: true,
  level_too_low: true,
  stat_too_low: true,
  sync_too_low: true,
  weapon_mismatch: true,
  insufficient_coins: true,
  insufficient_items: true,
  insufficient_resource: true,
  inventory_full: true,
  overweight: true,
  slot_occupied: true,
  not_owner: true,
  item_locked: true,
  shop_closed: true,
  out_of_stock: true,
  max_listings: true,
  price_changed: true,
  listing_gone: true,
  not_in_party: true,
  party_full: true,
  not_leader: true,
  clan_rank: true,
  clan_full: true,
  name_taken: true,
  forbidden_zone: true,
  outlaw: true,
  muted: true,
  blocked: true,
  target_busy: true,
  server_full: true,
  upgrade_max: true,
  no_socket: true,
  socket_full: true,
  trait_locked: true,
  already_known: true,
  sync_cap: true,
  daily_done: true,
  not_attuned: true,
  gm_only: true,
  downed: true,
  fallen: true,
  not_downed: true,
  no_rescue: true,
  rescue_busy: true,
  not_executable: true,
  target_offline: true,
  consent_declined: true,
  consent_timeout: true,
  window_closed: true,
  window_closing: true,
  illegal_offhand: true,
  two_handed_lock: true,
  wrong_slot: true,
  character_exists: true,
};

describe('error codes', () => {
  it('the list and the union name the same codes', () => {
    expectTypeOf<(typeof ERROR_CODES)[number]>().toEqualTypeOf<ErrorCode>();
    expect([...ERROR_CODES].sort()).toEqual(Object.keys(EVERY_ERROR_CODE).sort());
  });

  it('lists every code once', () => {
    expect(new Set(ERROR_CODES).size).toBe(ERROR_CODES.length);
  });

  it('the list cannot be changed at runtime', () => {
    expect(Object.isFrozen(ERROR_CODES)).toBe(true);
  });

  it('recognizes known codes only', () => {
    for (const code of ERROR_CODES) {
      expect(isErrorCode(code)).toBe(true);
    }
    for (const value of ['', 'INVALID', 'unknown', 'toString', 3, null, undefined, {}]) {
      expect(isErrorCode(value)).toBe(false);
    }
  });
});
