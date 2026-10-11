import { describe, expect, it } from 'vitest';
import type { Rarity } from '../types/items.js';
import * as keys from './keys.js';

const ID = 'sample_id_1';

const builders: readonly [string, () => string, string][] = [
  ['item name', () => keys.itemName(ID), `item.${ID}.name`],
  ['item description', () => keys.itemDesc(ID), `item.${ID}.desc`],
  ['readable title', () => keys.litTitle(ID), `lit.${ID}.title`],
  ['readable page', () => keys.litPage(ID, 3), `lit.${ID}.p3`],
  ['ability name', () => keys.abilityName(ID), `ability.${ID}.name`],
  ['ability description', () => keys.abilityDesc(ID), `ability.${ID}.desc`],
  ['monster name', () => keys.monName(ID), `mon.${ID}.name`],
  ['monster description', () => keys.monDesc(ID), `mon.${ID}.desc`],
  ['monster attack', () => keys.monAttack(ID, 'bite'), `mon.${ID}.attack.bite`],
  ['npc name', () => keys.npcName(ID), `npc.${ID}.name`],
  ['npc unknown name', () => keys.npcUnknownName(ID), `npc.${ID}.unknown_name`],
  ['buff name', () => keys.buffName(ID), `buff.${ID}.name`],
  ['buff description', () => keys.buffDesc(ID), `buff.${ID}.desc`],
  ['title name', () => keys.titleName(ID), `title.${ID}.name`],
  ['title description', () => keys.titleDesc(ID), `title.${ID}.desc`],
  ['guild name', () => keys.guildName(ID), `guild.${ID}.name`],
  ['faction name', () => keys.factionName(ID), `faction.${ID}.name`],
  ['quest name', () => keys.questName(ID), `quest.${ID}.name`],
  ['quest description', () => keys.questDesc(ID), `quest.${ID}.desc`],
  ['quest step', () => keys.questStepDesc(ID, 'step_2'), `quest.${ID}.step_2.desc`],
  ['quest objective', () => keys.questObjective(ID, 'step_2', 1), `quest.${ID}.step_2.obj1`],
  ['dialogue node', () => keys.dlgNode('dlg_tree', 'start'), 'dlg.dlg_tree.start'],
  ['dialogue choice', () => keys.dlgChoice('dlg_tree', 'start', 0), 'dlg.dlg_tree.start.c0'],
  ['map name', () => keys.mapName(ID), `map.${ID}.name`],
  ['zone name', () => keys.zoneName(ID), `zone.${ID}.name`],
  ['site name', () => keys.siteName(ID), `site.${ID}.name`],
  ['waystone name', () => keys.waystoneName(ID), `waystone.${ID}.name`],
  ['recipe name', () => keys.recipeName(ID), `recipe.${ID}.name`],
  ['profession name', () => keys.professionName(ID), `prof.${ID}.name`],
  ['gathering node name', () => keys.nodeName(ID), `node.${ID}.name`],
  ['affix line', () => keys.affixLine(ID), `affix.${ID}.line`],
  ['trait name', () => keys.traitName(ID), `trait.${ID}.name`],
  ['trait description', () => keys.traitDesc(ID), `trait.${ID}.desc`],
  ['status name', () => keys.statusName(ID), `status.${ID}.name`],
  ['status description', () => keys.statusDesc(ID), `status.${ID}.desc`],
  ['aspect name', () => keys.aspectName('order'), 'aspect.order.name'],
  ['stat name', () => keys.statName('wis'), 'stat.wis.name'],
  ['rarity name', () => keys.rarityName(9), 'rarity.9.name'],
  ['lowest rarity name', () => keys.rarityName(0), 'rarity.0.name'],
  ['interface text', () => keys.uiKey('inventory', 'title'), 'ui.inventory.title'],
  [
    'nested interface text',
    () => keys.uiKey('rescue', 'consent', 'prompt'),
    'ui.rescue.consent.prompt',
  ],
  ['toast', () => keys.toastKey('loot', 'picked'), 'toast.loot.picked'],
  ['error', () => keys.errKey('too_far'), 'err.too_far'],
  ['system notice', () => keys.sysKey('restart'), 'sys.restart'],
  ['term', () => keys.termKey('character'), 'term.character'],
  ['form of address', () => keys.termKey('address', '1'), 'term.address.1'],
];

describe('string key builders', () => {
  it.each(builders)('%s', (_name, build, expected) => {
    expect(build()).toBe(expected);
  });

  it('accepts lowercase letters, digits and underscores as a segment', () => {
    expect(keys.isValidKeySegment('abc_123')).toBe(true);
    expect(keys.isValidKeySegment('')).toBe(false);
    expect(keys.isValidKeySegment('Abc')).toBe(false);
    expect(keys.isValidKeySegment('a b')).toBe(false);
    expect(keys.isValidKeySegment('a.b')).toBe(false);
    expect(keys.isValidKeySegment('a-b')).toBe(false);
  });

  it.each(['Item_Sword', 'item sword', 'item.sword', '', 'é'])('rejects the id "%s"', (id) => {
    expect(() => keys.itemName(id)).toThrow(RangeError);
  });

  it('rejects invalid segments anywhere in the key', () => {
    expect(() => keys.monAttack('mon_wolf', 'Bite')).toThrow(RangeError);
    expect(() => keys.uiKey('inventory', 'title', 'sub.path')).toThrow(RangeError);
    expect(() => keys.errKey('TOO_FAR')).toThrow(RangeError);
  });

  it('rejects page and choice numbers out of range', () => {
    expect(() => keys.litPage(ID, 0)).toThrow(RangeError);
    expect(() => keys.litPage(ID, 1.5)).toThrow(RangeError);
    expect(() => keys.dlgChoice('dlg_tree', 'start', -1)).toThrow(RangeError);
    expect(() => keys.questObjective(ID, 'step_1', Number.NaN)).toThrow(RangeError);
  });

  it('rejects a rarity outside the ten rarities', () => {
    expect(() => keys.rarityName(10 as Rarity)).toThrow(RangeError);
    expect(() => keys.rarityName(-1 as Rarity)).toThrow(RangeError);
    expect(() => keys.rarityName(1.5 as Rarity)).toThrow(RangeError);
  });

  it('offers no builder outside the public namespaces', () => {
    const namespaces = builders.map(([, build]) => build().split('.')[0]);
    expect(new Set(namespaces).has('secret')).toBe(false);
    expect(Object.keys(keys).some((name) => name.toLowerCase().includes('secret'))).toBe(false);
  });
});
