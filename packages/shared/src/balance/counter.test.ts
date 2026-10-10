import { describe, expect, it } from 'vitest';
import type { Aspect } from '../types/aspect.js';
import golden from './__golden__/counter.json' with { type: 'json' };
import {
  clampCounter,
  counterMultiplier,
  monsterResist,
  perTagCounter,
  relation,
  type AspectProfile,
} from './counter.js';

interface CounterCase {
  readonly name: string;
  readonly tags: readonly Aspect[];
  readonly profile: AspectProfile;
  readonly expected: number;
}

const CASES = golden.cases as readonly CounterCase[];

describe('aspect counter cycle', () => {
  it('relates an aspect to the one it beats, the one beating it, and the rest', () => {
    expect(relation('entropy', 'growth')).toBe(1);
    expect(relation('growth', 'entropy')).toBe(-1);
    expect(relation('entropy', 'entropy')).toBe(0);
    expect(relation('entropy', 'change')).toBe(0);
  });

  it('weights the secondary aspect at half and adds the weakness bonus', () => {
    const profile: AspectProfile = {
      primary: 'growth',
      secondary: 'order',
      vulnerable: ['entropy'],
    };
    expect(perTagCounter('entropy', profile)).toBeCloseTo(0.425, 4);
    expect(perTagCounter('void', {})).toBe(0);
  });

  it('keeps the multiplier inside its bounds', () => {
    expect(clampCounter(2)).toBeCloseTo(1.45, 4);
    expect(clampCounter(0.1)).toBeCloseTo(0.7, 4);
    expect(clampCounter(1.1)).toBeCloseTo(1.1, 4);
  });
});

describe('aspect counter multiplier', () => {
  it.each(CASES)('$name', ({ tags, profile, expected }) => {
    expect(counterMultiplier(tags, profile)).toBeCloseTo(expected, 4);
  });
});

describe('monster resist', () => {
  it('resists its own primary aspect by default', () => {
    expect(monsterResist('growth', { primary: 'growth' })).toBe(0.25);
    expect(monsterResist('order', { primary: 'growth' })).toBe(0);
  });

  it('lets explicit values override the default', () => {
    expect(monsterResist('growth', { primary: 'growth' }, { growth: 0.1 })).toBe(0.1);
    expect(monsterResist('void', { primary: 'growth' }, { void: -0.2 })).toBe(-0.2);
  });
});
