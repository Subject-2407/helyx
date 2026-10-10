import { describe, expect, it } from 'vitest';
import { SequenceRng, U32_MAX } from '../../rng/rng.js';
import { createSfc32 } from '../../rng/sfc32.js';
import { SEED_A } from '../../testing/seeds.js';
import { sum } from '../math.js';
import golden from './__golden__/crafting.json' with { type: 'json' };
import fees from './__golden__/fees.json' with { type: 'json' };
import {
  craftedRarityRow,
  craftXp,
  gatherYield,
  masterworkChance,
  professionXpToNext,
  rollCraftedRarity,
} from './crafting.js';
import {
  bankExpansionCost,
  bankExpansionCount,
  bankSlots,
  clanFoundingCost,
  listingFee,
  reshapeCost,
  salesTax,
  sellerProceeds,
  stallRent,
  stallTax,
} from './fees.js';

const TABLE = golden.craftedRarity;

describe('crafted rarity', () => {
  it('has rows that each sum to 100', () => {
    for (const row of TABLE) {
      expect(sum(row.weights)).toBe(100);
    }
  });

  it.each(golden.rowFor)('margin $margin uses the row from $minMargin', ({ margin, minMargin }) => {
    expect(craftedRarityRow(margin, TABLE).minMargin).toBe(minMargin);
  });

  it('rejects a margin no row covers', () => {
    expect(() => craftedRarityRow(-1, TABLE)).toThrow(RangeError);
  });

  it.each(golden.masterwork)('masterwork chance at level $level', ({ level, chance }) => {
    expect(masterworkChance(level)).toBeCloseTo(chance, 9);
  });

  it('raises a masterwork by one rarity but never above epic', () => {
    // Highest roll picks the last weighted rarity; lowest roll then passes the masterwork chance.
    const epic = rollCraftedRarity(20, TABLE, 0, new SequenceRng([U32_MAX, 0]));
    expect(epic).toBe(4);
    const raised = rollCraftedRarity(0, TABLE, 0, new SequenceRng([0, 0]));
    expect(raised).toBe(1);
    const plain = rollCraftedRarity(0, TABLE, 0, new SequenceRng([0, U32_MAX]));
    expect(plain).toBe(0);
  });

  it('rolls only rarities up to epic over many crafts', () => {
    const rng = createSfc32(SEED_A);
    for (let craft = 0; craft < 2_000; craft += 1) {
      expect(rollCraftedRarity(25, TABLE, 100, rng)).toBeLessThanOrEqual(4);
    }
  });
});

describe('profession progress', () => {
  it.each(golden.professionXp)('level $level needs $xp', ({ level, xp }) => {
    expect(professionXpToNext(level)).toBe(xp);
  });

  it.each(golden.craftXp)('margin $margin scales craft experience', ({ margin, mult }) => {
    expect(craftXp(100, margin)).toBeCloseTo(100 * mult, 9);
  });

  it.each(golden.gather)('gathering at level $level', ({ level, base }) => {
    expect(gatherYield(level, new SequenceRng([U32_MAX]))).toBe(base);
    expect(gatherYield(level, new SequenceRng([0]))).toBe(base + 1);
  });

  it('adds the bonus item at its chance', () => {
    const rng = createSfc32(SEED_A);
    let bonus = 0;
    const rolls = 100_000;
    for (let roll = 0; roll < rolls; roll += 1) {
      bonus += gatherYield(0, rng) - 1;
    }
    expect(Math.abs(bonus / rolls - golden.gatherBonusChance)).toBeLessThan(0.01);
  });
});

describe('coin sinks', () => {
  it.each(fees.reshape)('reshaping at level $level', ({ level, coins }) => {
    expect(reshapeCost(level)).toBe(coins);
  });

  it('grows the bank in nine expansions with tripling costs', () => {
    expect(bankExpansionCount()).toBe(fees.bank.length);
    expect(fees.bank.map((_cost, index) => bankExpansionCost(index + 1))).toEqual(fees.bank);
    expect(bankSlots(fees.bank.length)).toBe(fees.bankSlotsAfterAll);
    expect(() => bankExpansionCost(fees.bank.length + 1)).toThrow(RangeError);
  });

  it('charges the listing fee and sales tax', () => {
    const { price, fee, tax, seller } = fees.market;
    expect(listingFee(price)).toBe(fee);
    expect(salesTax(price)).toBe(tax);
    expect(sellerProceeds(price)).toBe(seller);
    expect(listingFee(fees.listingFeeMinimum.price)).toBe(fees.listingFeeMinimum.fee);
  });

  it('charges stall rent and tax, and the clan founding fee', () => {
    expect(stallRent(fees.stall.hours)).toBe(fees.stall.rent);
    expect(stallTax(fees.stall.sales)).toBe(fees.stall.tax);
    expect(clanFoundingCost()).toBe(fees.clanFounding);
  });
});
