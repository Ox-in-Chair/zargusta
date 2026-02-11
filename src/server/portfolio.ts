/** Portfolio calculations */
import type { BtcPrice, PortfolioSnapshot, FundSummary, FundInfo } from '../shared/types.js';

const TARGET_DATE = new Date('2036-04-01');

export function calculatePortfolio(
  summary: FundSummary,
  fundInfo: FundInfo,
  price: BtcPrice,
): PortfolioSnapshot {
  const totalBtc = summary.totalBtcAcquired;
  const valueZar = totalBtc * price.zar;
  const valueUsd = totalBtc * price.usd;
  const invested = summary.totalContributionsZar;
  const pnl = valueZar - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const augustaProgress = Math.min(100, (valueZar / fundInfo.targetAmountZar) * 100);
  const daysToTarget = Math.max(0, Math.ceil((TARGET_DATE.getTime() - Date.now()) / 86_400_000));
  const activeMembers = summary.activeMembers || 1;

  return {
    totalBtc,
    valueZar: Math.round(valueZar),
    valueUsd: Math.round(valueUsd),
    totalInvestedZar: invested,
    profitLossZar: Math.round(pnl),
    profitLossPct: Math.round(pnlPct * 100) / 100,
    augustaProgress: Math.round(augustaProgress * 100) / 100,
    daysToTarget,
    perMemberShareBtc: totalBtc / activeMembers,
    perMemberValueZar: Math.round(valueZar / activeMembers),
  };
}
