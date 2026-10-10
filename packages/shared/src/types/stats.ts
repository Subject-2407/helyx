/** The six primary stats, in display order. */
export const STAT_KEYS = Object.freeze(['str', 'dex', 'agi', 'vit', 'int', 'wis'] as const);

export type StatKey = (typeof STAT_KEYS)[number];
