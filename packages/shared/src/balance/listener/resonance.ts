/**
 * Zone resonance: how strongly each Aspect hums at a place and time. Every vector comes from
 * content (area bases, sub-zone adds, time of day, weather and season modifiers); this module
 * only combines them.
 */
import {
  ASPECTS,
  type Aspect,
  type AspectVector,
  type PartialAspectVector,
} from '../../types/aspect.js';
import { K_LISTENER } from './constants.js';
import { clamp, mean, roundTo } from '../math.js';

/** A sub-zone the position lies in. Where several overlap, only the highest priority counts. */
export interface ResonanceSubzone {
  readonly add: PartialAspectVector;
  readonly priority: number;
}

export interface ResonanceSources {
  readonly areaBase: PartialAspectVector;
  /** Every sub-zone containing the position; may be empty. */
  readonly subzones: readonly ResonanceSubzone[];
  readonly phaseAdd?: PartialAspectVector;
  readonly weatherAdd?: PartialAspectVector;
  readonly seasonAdd?: PartialAspectVector;
}

/** The overlapping sub-zone that applies: the highest priority, the first listed on a tie. */
export function activeSubzone(subzones: readonly ResonanceSubzone[]): ResonanceSubzone | undefined {
  let best: ResonanceSubzone | undefined;
  for (const zone of subzones) {
    if (best === undefined || zone.priority > best.priority) best = zone;
  }
  return best;
}

/** Final resonance per Aspect: the sum of every source, each component held to [−1, 1]. */
export function resonanceAt(sources: ResonanceSources): AspectVector {
  const zone = activeSubzone(sources.subzones);
  const layers = [
    sources.areaBase,
    zone?.add,
    sources.phaseAdd,
    sources.weatherAdd,
    sources.seasonAdd,
  ];
  const out: Partial<Record<Aspect, number>> = {};
  for (const aspect of ASPECTS) {
    let total = 0;
    for (const layer of layers) {
      total += layer?.[aspect] ?? 0;
    }
    out[aspect] = roundTo(
      clamp(total, K_LISTENER.RES_MIN, K_LISTENER.RES_MAX),
      K_LISTENER.RES_DECIMALS,
    );
  }
  return out as AspectVector;
}

/** Mean resonance over an ability's tags, which the second cast mode's power reads. */
export function meanResonance(resonance: PartialAspectVector, tags: readonly Aspect[]): number {
  return mean(tags.map((tag) => resonance[tag] ?? 0));
}
