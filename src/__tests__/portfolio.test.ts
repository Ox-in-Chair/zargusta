import { describe, it, expect } from 'vitest';
import { calculatePortfolio } from '../server/portfolio.js';
import type { BtcPrice, FundSummary, FundInfo, MemberShare } from '../shared/types.js';

function makeSummary(overrides: Partial<FundSummary> = {}): FundSummary {
  return {
    totalContributionsZar: 50000,
    totalBtcAcquired: 0.05,
    numberOfPurchases: 3,
    numberOfContributions: 10,
    activeMembers: 2,
    totalMembersAllTime: 3,
    memberContributions: { Alice: 25000, Bob: 25000 },
    memberShares: {
      Alice: { contributedZar: 25000, sharePct: 50, btcShare: 0.025 },
      Bob: { contributedZar: 25000, sharePct: 50, btcShare: 0.025 },
    },
    dataUpdated: new Date().toISOString(),
    lastBtcPurchase: '2024-01-01',
    memberTransitions: {},
    ...overrides,
  };
}

function makeFundInfo(overrides: Partial<FundInfo> = {}): FundInfo {
  return {
    name: 'ZARyder Cup Ryder Cup 2031 Fund',
    targetDate: '2031-09-26',
    targetAmountZar: 1000000,
    createdDate: '2021-10-01',
    description: 'test',
    btcPurchaser: 'Salad',
    currentBtcHoldings: 0.05,
    lastPurchaseDate: '2024-01-01',
    memberTransitions: {},
    ...overrides,
  };
}

function makePrice(overrides: Partial<BtcPrice> = {}): BtcPrice {
  return {
    zar: 2000000,
    usd: 100000,
    zar24hChange: 1.5,
    usd24hChange: 1.2,
    timestamp: new Date().toISOString(),
    source: 'test',
    ...overrides,
  };
}

describe('calculatePortfolio', () => {
  it('calculates valueZar = totalBtc * price.zar', () => {
    const result = calculatePortfolio(makeSummary(), makeFundInfo(), makePrice());
    expect(result.valueZar).toBe(Math.round(0.05 * 2000000));
  });

  it('calculates profitLoss = valueZar - totalInvested', () => {
    const result = calculatePortfolio(makeSummary(), makeFundInfo(), makePrice());
    expect(result.profitLossZar).toBe(Math.round(0.05 * 2000000 - 50000));
  });

  it('calculates augustaProgress percentage', () => {
    const result = calculatePortfolio(makeSummary(), makeFundInfo({ targetAmountZar: 1000000 }), makePrice());
    const expected = Math.round(((0.05 * 2000000) / 1000000) * 100 * 100) / 100;
    expect(result.augustaProgress).toBe(expected);
  });

  it('caps augustaProgress at 100', () => {
    const result = calculatePortfolio(
      makeSummary({ totalBtcAcquired: 1, memberShares: { Alice: { contributedZar: 50000, sharePct: 100, btcShare: 1 } } }),
      makeFundInfo({ targetAmountZar: 100000 }),
      makePrice(),
    );
    expect(result.augustaProgress).toBe(100);
  });

  it('calculates daysToTarget as positive (target is 2031-09-26)', () => {
    const result = calculatePortfolio(makeSummary(), makeFundInfo(), makePrice());
    expect(result.daysToTarget).toBeGreaterThan(0);
  });

  it('calculates perMemberBreakdown with proportional shares', () => {
    const result = calculatePortfolio(makeSummary(), makeFundInfo(), makePrice());
    expect(result.perMemberBreakdown).toHaveProperty('Alice');
    expect(result.perMemberBreakdown).toHaveProperty('Bob');
    expect(result.perMemberBreakdown['Alice'].btcShare).toBe(0.025);
    expect(result.perMemberBreakdown['Alice'].sharePct).toBe(50);
    expect(result.perMemberBreakdown['Alice'].valueZar).toBe(Math.round(0.025 * 2000000));
  });

  it('handles unequal contributions in perMemberBreakdown', () => {
    const summary = makeSummary({
      memberShares: {
        Alice: { contributedZar: 30000, sharePct: 60, btcShare: 0.03 },
        Bob: { contributedZar: 20000, sharePct: 40, btcShare: 0.02 },
      },
    });
    const result = calculatePortfolio(summary, makeFundInfo(), makePrice());
    expect(result.perMemberBreakdown['Alice'].sharePct).toBe(60);
    expect(result.perMemberBreakdown['Bob'].sharePct).toBe(40);
    expect(result.perMemberBreakdown['Alice'].btcShare).toBe(0.03);
  });

  it('handles 0 BTC holdings', () => {
    const result = calculatePortfolio(
      makeSummary({ totalBtcAcquired: 0, memberShares: {} }),
      makeFundInfo(),
      makePrice(),
    );
    expect(result.valueZar).toBe(0);
    expect(result.profitLossZar).toBe(-50000);
    expect(result.totalBtc).toBe(0);
    expect(Object.keys(result.perMemberBreakdown)).toHaveLength(0);
  });

  it('handles empty memberShares gracefully', () => {
    const result = calculatePortfolio(
      makeSummary({ memberShares: {} }),
      makeFundInfo(),
      makePrice(),
    );
    expect(result.perMemberBreakdown).toEqual({});
  });
});
