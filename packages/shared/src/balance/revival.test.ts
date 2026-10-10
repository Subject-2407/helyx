import { describe, expect, it } from 'vitest';
import golden from './__golden__/revival.json' with { type: 'json' };
import {
  canPingForHelp,
  CHANNEL_RULES,
  clampHp,
  downedTimerS,
  frayedDamage,
  frayedMaxHp,
  hasGivenUp,
  isAutoReviveAvailable,
  isInChannelRange,
  refreshFrayedS,
  resolveLethal,
  resurrectionWindow,
  reviverCredit,
  reviveResult,
  type LethalOutcome,
  type ReviveSource,
} from './revival.js';

describe('lethal damage', () => {
  it.each(golden.lethal)(
    'rescue $noRescue, armed $featherArmed, locked $featherLocked',
    ({ noRescue, featherArmed, featherLocked, outcome }) => {
      expect(resolveLethal({ noRescue, featherArmed, featherLocked })).toBe(
        outcome as LethalOutcome,
      );
    },
  );
});

describe('downed', () => {
  it.each(golden.downed)('$frayedDowns earlier downs', ({ frayedDowns, timerS }) => {
    expect(downedTimerS(frayedDowns)).toBe(timerS);
  });

  it('gives up after holding the key and pings for help on a cooldown', () => {
    expect(hasGivenUp(1.99)).toBe(false);
    expect(hasGivenUp(2)).toBe(true);
    expect(canPingForHelp(undefined)).toBe(true);
    expect(canPingForHelp(2.9)).toBe(false);
    expect(canPingForHelp(3)).toBe(true);
    expect(() => downedTimerS(-1)).toThrow(RangeError);
  });
});

describe('frayed', () => {
  it.each(golden.frayedMaxHp)('max health $base becomes $frayed', ({ base, frayed }) => {
    expect(frayedMaxHp(base)).toBe(frayed);
  });

  it('clamps current health and weakens damage dealt', () => {
    expect(clampHp(250, frayedMaxHp(284))).toBe(227);
    expect(clampHp(100, 227)).toBe(100);
    expect(frayedDamage(golden.frayedDamage.hit)).toBe(golden.frayedDamage.dealt);
  });

  it('restarts at full length instead of stacking', () => {
    expect(refreshFrayedS('rekindle')).toBe(300);
    expect(refreshFrayedS('resurrect')).toBe(600);
  });
});

describe('coming back', () => {
  it.each(golden.revive)('$source', ({ source, frayedMax, ...expected }) => {
    expect(reviveResult(frayedMax, source as ReviveSource)).toEqual(expected);
  });

  it('locks the auto-revive item for ten minutes after a trigger', () => {
    expect(isAutoReviveAvailable(undefined)).toBe(true);
    expect(isAutoReviveAvailable(golden.lockout.blockedAtS)).toBe(false);
    expect(isAutoReviveAvailable(golden.lockout.availableAtS)).toBe(true);
  });

  it('credits the reviver with a fifth of the target max health', () => {
    expect(reviverCredit(227)).toBeCloseTo(45.4, 6);
  });
});

describe('channels', () => {
  it('have their times and ranges', () => {
    expect(CHANNEL_RULES).toEqual(golden.channels);
    expect(isInChannelRange('rekindle', 48)).toBe(true);
    expect(isInChannelRange('salve', 33)).toBe(false);
  });

  it('keep the resurrection window and consent time', () => {
    expect(resurrectionWindow()).toEqual(golden.window);
  });
});
