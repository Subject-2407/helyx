/** Equipment slots of a character. Both accessory slots take any accessory. */
export const EQUIP_SLOTS = Object.freeze([
  'main_hand',
  'off_hand',
  'head',
  'body',
  'hands',
  'feet',
  'accessory_1',
  'accessory_2',
] as const);

export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export const ITEM_CATEGORIES = Object.freeze([
  'currency',
  'equipment',
  'consumable',
  'material',
  'literature',
  'tool',
  'container',
  'key',
] as const);

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

/** Every kind of container an item instance can belong to. */
export const OWNER_TYPES = Object.freeze([
  'inv',
  'equip',
  'bank',
  'remnant',
  'listing',
  'exchange_ledger',
  'stall',
  'clan_vault',
  'ground',
] as const);

export type OwnerType = (typeof OWNER_TYPES)[number];

/**
 * Stable ids of the ten rarities, lowest first; a rarity's number is its position here.
 * Display names come from the string tables.
 */
export const RARITY_KEYS = Object.freeze([
  'common',
  'uncommon',
  'rare',
  'elite',
  'epic',
  'legendary',
  'mythic',
  'ancient',
  'immortal',
  'celestial',
] as const);

export type RarityKey = (typeof RARITY_KEYS)[number];

/** Rarity as stored on an item: 0 (common) to 9 (celestial). */
export type Rarity = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Every rarity number, lowest first. */
export const RARITIES = Object.freeze([0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const);

export const WEAPON_CATEGORIES = Object.freeze([
  'sword',
  'greatsword',
  'dagger',
  'bow',
  'catalyst',
  'shield',
  'fist',
] as const);

export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];

/** Enchant grade I, II or III. */
export type EnchantGrade = 1 | 2 | 3;
