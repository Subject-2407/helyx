import { describe, expect, it } from 'vitest';
import golden from './__golden__/karma.json' with { type: 'json' };
import {
  aggressorUntil,
  applyKarma,
  atonementCost,
  canDamageInContested,
  canDamagePlayer,
  isBountyAvailable,
  karmaDelta,
  outlawBounty,
  pvpFlagFor,
  type KarmaContext,
} from './karma.js';

const ctx: KarmaContext = { karma: 0, level: 10, zone: 'contested' };

describe('karma events', () => {
  it('punishes killing an Innocent and flags the killer', () => {
    const outcome = karmaDelta('kill_innocent', ctx);
    expect(outcome).toEqual({ delta: golden.killInnocent.delta, aggressor: true, bounty: 0 });
    const karma = applyKarma(0, outcome.delta);
    expect(pvpFlagFor(karma, 0, 0)).toBe('outlaw');
    expect(pvpFlagFor(golden.killInnocent.outlawAt + 1, 0, 0)).toBe('innocent');
  });

  it('flags without karma for damaging an Innocent or helping a flagged player', () => {
    expect(karmaDelta('damage_innocent', ctx)).toEqual({ delta: 0, aggressor: true, bounty: 0 });
    expect(karmaDelta('assist_flagged', ctx)).toEqual({ delta: 0, aggressor: true, bounty: 0 });
  });

  it('pays a bounty only for an Outlaw', () => {
    const outlaw = { ...ctx, victimFlag: 'outlaw' as const, victimLevel: 12 };
    expect(karmaDelta('kill_flagged', outlaw).bounty).toBe(600);
    const aggressor = { ...ctx, victimFlag: 'aggressor' as const, victimLevel: 12 };
    expect(karmaDelta('kill_flagged', aggressor)).toEqual({
      delta: 0,
      aggressor: false,
      bounty: 0,
    });
  });

  it('restores karma from monster kills only while negative and within the level window', () => {
    const negative = { ...ctx, karma: -50 };
    expect(karmaDelta('monster_kill', { ...negative, monsterLevel: 5 }).delta).toBe(1);
    expect(karmaDelta('monster_kill', { ...negative, monsterLevel: 4 }).delta).toBe(0);
    expect(karmaDelta('monster_kill', { ...ctx, monsterLevel: 10 }).delta).toBe(0);
    expect(karmaDelta('monster_kill', negative).delta).toBe(0);
  });

  it('restores karma from quests only while negative, and from atonement always', () => {
    expect(karmaDelta('quest_complete', { ...ctx, karma: -1 }).delta).toBe(golden.quest.delta);
    expect(karmaDelta('quest_complete', ctx).delta).toBe(0);
    expect(karmaDelta('atonement', ctx).delta).toBe(golden.atonement.delta);
  });

  it('ignores player events in lawless zones', () => {
    expect(karmaDelta('kill_innocent', { ...ctx, zone: 'lawless' })).toEqual({
      delta: 0,
      aggressor: false,
      bounty: 0,
    });
  });

  it('refuses events nobody registered a rule for', () => {
    expect(() => karmaDelta('atonement', ctx, new Map())).toThrow(RangeError);
  });
});

describe('karma range and flags', () => {
  it('keeps karma inside its range', () => {
    expect(applyKarma(-990, -100)).toBe(golden.range.min);
    expect(applyKarma(95, 10)).toBe(golden.range.max);
  });

  it('keeps the Aggressor flag while its timer runs', () => {
    const until = aggressorUntil(10);
    expect(until).toBe(10 + golden.aggressorS);
    expect(pvpFlagFor(0, until, until - 0.1)).toBe('aggressor');
    expect(pvpFlagFor(0, until, until)).toBe('innocent');
  });
});

describe('level bracket', () => {
  it('lets Innocents be attacked only within eight levels', () => {
    expect(canDamageInContested(10, 10 + golden.bracket.allowed, 'innocent')).toBe(true);
    expect(canDamageInContested(10, 10 + golden.bracket.refused, 'innocent')).toBe(false);
    expect(canDamageInContested(30, 10, 'aggressor')).toBe(true);
    expect(canDamageInContested(30, 10, 'outlaw')).toBe(true);
  });

  it('applies by zone tier', () => {
    expect(canDamagePlayer('safe', 10, 10, 'outlaw')).toBe(false);
    expect(canDamagePlayer('lawless', 10, 40, 'innocent')).toBe(true);
    expect(canDamagePlayer('contested', 10, 40, 'innocent')).toBe(false);
  });
});

describe('karma coin amounts', () => {
  it.each(golden.atonement.samples)('atonement at level $level', ({ level, cost }) => {
    expect(atonementCost(level)).toBe(cost);
  });

  it.each(golden.bounty.samples)('bounty at level $level', ({ level, coins }) => {
    expect(outlawBounty(level)).toBe(coins);
  });

  it('pays a bounty on one target at most once per cooldown', () => {
    expect(isBountyAvailable(undefined)).toBe(true);
    expect(isBountyAvailable(golden.bounty.cooldownS - 1)).toBe(false);
    expect(isBountyAvailable(golden.bounty.cooldownS)).toBe(true);
    expect(() => atonementCost(0)).toThrow(RangeError);
  });
});
