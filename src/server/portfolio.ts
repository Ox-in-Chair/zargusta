/** Portfolio calculations */
import type { BtcPrice, PortfolioSnapshot, FundSummary, FundInfo } from '../shared/types.js';

const TARGET_DATE = new Date('2031-09-26');

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

  // Per-member breakdown from proportional shares
  const perMemberBreakdown: Record<string, { btcShare: number; valueZar: number; sharePct: number }> = {};
  for (const [name, share] of Object.entries(summary.memberShares)) {
    perMemberBreakdown[name] = {
      btcShare: share.btcShare,
      valueZar: Math.round(share.btcShare * price.zar),
      sharePct: share.sharePct,
    };
  }

  return {
    totalBtc,
    valueZar: Math.round(valueZar),
    valueUsd: Math.round(valueUsd),
    totalInvestedZar: invested,
    profitLossZar: Math.round(pnl),
    profitLossPct: Math.round(pnlPct * 100) / 100,
    augustaProgress: Math.round(augustaProgress * 100) / 100,
    daysToTarget,
    perMemberBreakdown,
  };
}
