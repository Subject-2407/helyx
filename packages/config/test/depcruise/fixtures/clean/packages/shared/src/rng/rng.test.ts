import { expect, it } from 'vitest';
import { nextValue } from './rng';

it('is deterministic', () => {
  expect(nextValue(1)).toBe(nextValue(1));
});
