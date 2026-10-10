import { describe, expect, it } from 'vitest';
import golden from './__golden__/counter.json' with { type: 'json' };
import {
  ASPECT_TAGS,
  clampCounter,
  COUNTER_BEATS,
  counterMultiplier,
  perTagCounter,
  relation,
  type AspectProfile,
  type AspectTag,
} from './counter.js';

interface CounterCase {
  readonly name: string;
  readonly tags: readonly AspectTag[];
  readonly profile: AspectProfile;
  readonly expected: number;
}

const CASES = golden.cases as readonly CounterCase[];

describe('aspect counter cycle', () => {
  it('forms one cycle through all six aspects', () => {
    const seen = new Set<AspectTag>();
    let current: AspectTag = 'entropy';
    for (let step = 0; step < ASPECT_TAGS.length; step += 1) {
      seen.add(current);
      current = COUNTER_BEATS[current];
    }
    expect(current).toBe('entropy');
    expect(seen.size).toBe(ASPECT_TAGS.length);
  });

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
