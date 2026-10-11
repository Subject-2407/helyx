import { describe, expect, it } from 'vitest';
import golden from './__golden__/resonance.json' with { type: 'json' };
import { activeSubzone, meanResonance, resonanceAt } from './resonance.js';

describe('zone resonance', () => {
  it('adds a sub-zone, the time of day and the season to the area base', () => {
    const c = golden.willowmereSummerDay;
    const r = resonanceAt(c);
    expect(r.growth).toBeCloseTo(c.expected.growth, 6);
    expect(r.void).toBeCloseTo(c.expected.void, 6);
    expect(r.force).toBeCloseTo(c.expected.force, 6);
  });

  it('holds each Aspect at the top of its range', () => {
    const c = golden.greyrendAutumnNight;
    expect(resonanceAt(c).entropy).toBe(c.expected.entropy);
  });

  it('holds each Aspect at the bottom of its range', () => {
    const c = golden.belowTheFloor;
    expect(resonanceAt(c).void).toBe(c.expected.void);
  });

  it('applies only the highest priority of overlapping sub-zones', () => {
    const r = resonanceAt({ areaBase: {}, subzones: golden.overlap.subzones });
    expect(r.order).toBe(golden.overlap.expected.order);
    expect(r.growth).toBe(golden.overlap.expected.growth);
    expect(activeSubzone([])).toBeUndefined();
  });

  it('averages resonance over the tags', () => {
    expect(meanResonance({ change: 0.3, force: 0.1 }, ['change', 'force'])).toBeCloseTo(0.2, 6);
    expect(meanResonance({ change: 0.3 }, [])).toBe(0);
  });
});
