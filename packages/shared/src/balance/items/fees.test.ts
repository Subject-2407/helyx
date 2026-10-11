import { describe, expect, it } from 'vitest';
import golden from './__golden__/fees.json' with { type: 'json' };
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

describe('coin sinks', () => {
  it.each(golden.reshape)('reshaping at level $level', ({ level, coins }) => {
    expect(reshapeCost(level)).toBe(coins);
  });

  it('grows the bank in nine expansions with tripling costs', () => {
    expect(bankExpansionCount()).toBe(golden.bank.length);
    expect(golden.bank.map((_cost, index) => bankExpansionCost(index + 1))).toEqual(golden.bank);
    expect(bankSlots(golden.bank.length)).toBe(golden.bankSlotsAfterAll);
    expect(() => bankExpansionCost(golden.bank.length + 1)).toThrow(RangeError);
  });

  it('never counts bank slots past the largest size', () => {
    expect(bankSlots(golden.bank.length + 1)).toBe(golden.bankSlotsAfterAll);
  });

  it('charges the listing fee and sales tax', () => {
    const { price, fee, tax, seller } = golden.market;
    expect(listingFee(price)).toBe(fee);
    expect(salesTax(price)).toBe(tax);
    expect(sellerProceeds(price)).toBe(seller);
    expect(listingFee(golden.listingFeeMinimum.price)).toBe(golden.listingFeeMinimum.fee);
  });

  it('charges stall rent and tax, and the clan founding fee', () => {
    expect(stallRent(golden.stall.hours)).toBe(golden.stall.rent);
    expect(stallTax(golden.stall.sales)).toBe(golden.stall.tax);
    expect(clanFoundingCost()).toBe(golden.clanFounding);
  });

  it('rejects inputs outside their ranges', () => {
    expect(() => reshapeCost(0)).toThrow(RangeError);
    expect(() => bankExpansionCost(0)).toThrow(RangeError);
    expect(() => bankSlots(-1)).toThrow(RangeError);
    expect(() => listingFee(-1)).toThrow(RangeError);
    expect(() => salesTax(-1)).toThrow(RangeError);
    expect(() => stallRent(1.5)).toThrow(RangeError);
    expect(() => stallTax(-1)).toThrow(RangeError);
  });
});
