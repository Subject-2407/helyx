import { expect } from 'vitest';

export const expectFinite = (value: number): void => {
  expect(Number.isFinite(value)).toBe(true);
};
