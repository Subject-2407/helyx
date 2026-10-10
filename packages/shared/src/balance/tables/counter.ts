import type { Aspect } from '../../types/aspect.js';

/**
 * Which Aspect each Aspect beats (the Turning). Following it from any Aspect visits all six
 * once before coming back.
 */
export const ASPECT_BEATS: Readonly<Record<Aspect, Aspect>> = Object.freeze({
  entropy: 'growth',
  order: 'entropy',
  change: 'order',
  force: 'change',
  void: 'force',
  growth: 'void',
});
