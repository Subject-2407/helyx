/**
 * Builders for string-table keys. Code never writes a key by hand: it asks a builder, so every
 * key follows the same `<namespace>.<id or path>.<field>` shape and a typo in an id or a field
 * fails loudly instead of showing a missing string to players.
 *
 * Every segment is lowercase letters, digits and underscores. A dot inside an id would split
 * it into two segments, so it is rejected like any other invalid character.
 */
import type { Aspect } from '../types/aspect.js';
import { RARITY_KEYS, type Rarity } from '../types/items.js';
import type { StatKey } from '../types/stats.js';

const KEY_SEGMENT = /^[a-z0-9_]+$/;

/** Whether a string can be one segment of a key. */
export function isValidKeySegment(segment: string): boolean {
  return KEY_SEGMENT.test(segment);
}

function joinKey(...segments: readonly string[]): string {
  for (const segment of segments) {
    if (!isValidKeySegment(segment)) {
      throw new RangeError(`invalid string key segment "${segment}"`);
    }
  }
  return segments.join('.');
}

/** A numbered segment such as `p3` or `c0`. */
function numbered(prefix: string, n: number, min: number): string {
  if (!Number.isInteger(n) || n < min) {
    throw new RangeError(`string key number must be a whole number of at least ${min}, got ${n}`);
  }
  return `${prefix}${n}`;
}

export const itemName = (id: string): string => joinKey('item', id, 'name');
export const itemDesc = (id: string): string => joinKey('item', id, 'desc');

export const litTitle = (id: string): string => joinKey('lit', id, 'title');
/** One page of a readable item; pages count from 1. */
export const litPage = (id: string, page: number): string =>
  joinKey('lit', id, numbered('p', page, 1));

export const abilityName = (id: string): string => joinKey('ability', id, 'name');
export const abilityDesc = (id: string): string => joinKey('ability', id, 'desc');

export const monName = (id: string): string => joinKey('mon', id, 'name');
export const monDesc = (id: string): string => joinKey('mon', id, 'desc');
/** One attack in a monster's bestiary entry. */
export const monAttack = (id: string, attackId: string): string =>
  joinKey('mon', id, 'attack', attackId);

export const npcName = (id: string): string => joinKey('npc', id, 'name');
/** What an NPC is called before the player has been introduced. */
export const npcUnknownName = (id: string): string => joinKey('npc', id, 'unknown_name');

export const buffName = (id: string): string => joinKey('buff', id, 'name');
export const buffDesc = (id: string): string => joinKey('buff', id, 'desc');

export const titleName = (id: string): string => joinKey('title', id, 'name');
export const titleDesc = (id: string): string => joinKey('title', id, 'desc');
export const guildName = (id: string): string => joinKey('guild', id, 'name');
export const factionName = (id: string): string => joinKey('faction', id, 'name');

export const questName = (id: string): string => joinKey('quest', id, 'name');
export const questDesc = (id: string): string => joinKey('quest', id, 'desc');
export const questStepDesc = (id: string, stepId: string): string =>
  joinKey('quest', id, stepId, 'desc');
export const questObjective = (id: string, stepId: string, n: number): string =>
  joinKey('quest', id, stepId, numbered('obj', n, 0));

/** The text of a dialogue or event node. */
export const dlgNode = (treeId: string, nodeKey: string): string => joinKey('dlg', treeId, nodeKey);
/** One choice of a dialogue node; choices count from 0. */
export const dlgChoice = (treeId: string, nodeKey: string, choice: number): string =>
  joinKey('dlg', treeId, nodeKey, numbered('c', choice, 0));

export const mapName = (id: string): string => joinKey('map', id, 'name');
export const zoneName = (id: string): string => joinKey('zone', id, 'name');
export const siteName = (id: string): string => joinKey('site', id, 'name');
export const waystoneName = (id: string): string => joinKey('waystone', id, 'name');

export const recipeName = (id: string): string => joinKey('recipe', id, 'name');
export const professionName = (id: string): string => joinKey('prof', id, 'name');
export const nodeName = (id: string): string => joinKey('node', id, 'name');

/** An affix line; the message takes the rolled amount as `{value}`. */
export const affixLine = (id: string): string => joinKey('affix', id, 'line');
export const traitName = (id: string): string => joinKey('trait', id, 'name');
export const traitDesc = (id: string): string => joinKey('trait', id, 'desc');
export const statusName = (id: string): string => joinKey('status', id, 'name');
export const statusDesc = (id: string): string => joinKey('status', id, 'desc');

export const aspectName = (aspect: Aspect): string => joinKey('aspect', aspect, 'name');
export const statName = (stat: StatKey): string => joinKey('stat', stat, 'name');

/** Rarities are keyed by their number, so renaming a rarity never moves its key. */
export function rarityName(rarity: Rarity): string {
  if (!Number.isInteger(rarity) || rarity < 0 || rarity >= RARITY_KEYS.length) {
    throw new RangeError(`rarity must be 0 to ${RARITY_KEYS.length - 1}, got ${rarity}`);
  }
  return joinKey('rarity', String(rarity), 'name');
}

/** A piece of interface text: a panel and the element inside it, which may be a path. */
export const uiKey = (panel: string, element: string, ...subPath: readonly string[]): string =>
  joinKey('ui', panel, element, ...subPath);

export const toastKey = (domain: string, event: string): string => joinKey('toast', domain, event);

/** The message shown for a server error code. */
export const errKey = (code: string): string => joinKey('err', code);

/** A system notice such as a restart or maintenance warning. */
export const sysKey = (event: string): string => joinKey('sys', event);

/** Shared wording, such as the noun for a player character or an NPC's form of address. */
export const termKey = (term: string, ...subPath: readonly string[]): string =>
  joinKey('term', term, ...subPath);
