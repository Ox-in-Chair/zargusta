/** Portfolio analytics engine */
import type { Contribution, BtcPurchase, Member } from '../shared/types.js';

export interface MonthlySnapshot {
  month: string;
  contributionsZar: number;
  cumulativeInvestedZar: number;
  btcBought: number;
  cumulativeBtc: number;
  avgCostBasis: number;
  activeMembers: number;
  contributors: string[];
}

export interface MemberAnalytics {
  name: string;
  totalContributed: number;
  contributionCount: number;
  firstContribution: string;
  lastContribution: string;
  sharePercent: number;
  status: 'active' | 'left';
}

export interface AnalyticsResult {
  monthlySnapshots: MonthlySnapshot[];
  memberAnalytics: MemberAnalytics[];
  streaks: {
    currentMonthlyStreak: number;
    longestMonthlyStreak: number;
    missedMonths: string[];
  };
  costBasis: {
    weightedAvgZar: number;
    totalInvestedZar: number;
    totalBtc: number;
  };
  contributionStats: {
    avgMonthlyZar: number;
    maxMonthZar: number;
    maxMonthLabel: string;
    totalMonths: number;
  };
}

export function computeAnalytics(
  contributions: Contribution[],
  purchases: BtcPurchase[],
  members: Member[],
): AnalyticsResult {
  // ── Monthly snapshots ──
  const monthlyContribs = new Map<string, { total: number; names: Set<string> }>();
  for (const c of contributions) {
    const m = c.date.slice(0, 7);
    const entry = monthlyContribs.get(m) ?? { total: 0, names: new Set() };
    entry.total += c.amountZar;
    entry.names.add(c.memberName);
    monthlyContribs.set(m, entry);
  }

  const monthlyPurchases = new Map<string, { btc: number; spent: number }>();
  for (const p of purchases) {
    const m = p.date.slice(0, 7);
    const entry = monthlyPurchases.get(m) ?? { btc: 0, spent: 0 };
    entry.btc += p.btcBought;
    entry.spent += p.amountInvested ?? (p.btcBought * p.priceZar);
    monthlyPurchases.set(m, entry);
  }

  const allMonths = new Set([...monthlyContribs.keys(), ...monthlyPurchases.keys()]);
  const sortedMonths = [...allMonths].sort();

  let cumInvested = 0;
  let cumBtc = 0;
  let cumSpent = 0;

  const snapshots: MonthlySnapshot[] = sortedMonths.map(month => {
    const contrib = monthlyContribs.get(month);
    const purchase = monthlyPurchases.get(month);
    cumInvested += contrib?.total ?? 0;
    cumBtc += purchase?.btc ?? 0;
    cumSpent += purchase?.spent ?? 0;
    const monthEnd = new Date(month + '-28');
    const activeAtMonth = members.filter(m => {
      const joined = new Date(m.joinedDate);
      const left = m.leaveDate ? new Date(m.leaveDate) : null;
      return joined <= monthEnd && (!left || left >= monthEnd);
    }).length;
    return {
      month,
      contributionsZar: contrib?.total ?? 0,
      cumulativeInvestedZar: cumInvested,
      btcBought: purchase?.btc ?? 0,
      cumulativeBtc: cumBtc,
      avgCostBasis: cumBtc > 0 ? Math.round(cumSpent / cumBtc) : 0,
      activeMembers: activeAtMonth,
      contributors: contrib ? [...contrib.names] : [],
    };
  });

  // ── Member analytics ──
  const memberTotals = new Map<string, { total: number; count: number; first: string; last: string }>();
  for (const c of contributions) {
    const entry = memberTotals.get(c.memberName) ?? { total: 0, count: 0, first: c.date, last: c.date };
    entry.total += c.amountZar;
    entry.count++;
    if (c.date < entry.first) entry.first = c.date;
    if (c.date > entry.last) entry.last = c.date;
    memberTotals.set(c.memberName, entry);
  }

  const grandTotal = [...memberTotals.values()].reduce((s, e) => s + e.total, 0);
  const memberAnalytics: MemberAnalytics[] = members.map(m => {
    const stats = memberTotals.get(m.name) ?? { total: 0, count: 0, first: '', last: '' };
    return {
      name: m.name,
      totalContributed: stats.total,
      contributionCount: stats.count,
      firstContribution: stats.first,
      lastContribution: stats.last,
      sharePercent: grandTotal > 0 ? Math.round((stats.total / grandTotal) * 10000) / 100 : 0,
      status: m.status,
    };
  }).sort((a, b) => b.totalContributed - a.totalContributed);

  // ── Contribution streaks ──
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const contributionMonths = new Set(monthlyContribs.keys());
  const firstMonth = sortedMonths[0] ?? currentMonth;
  const allExpected: string[] = [];
  const [fy, fm] = firstMonth.split('-').map(Number);
  let cy = fy, cm = fm;
  while (`${cy}-${String(cm).padStart(2, '0')}` <= currentMonth) {
    allExpected.push(`${cy}-${String(cm).padStart(2, '0')}`);
    cm++;
    if (cm > 12) { cm = 1; cy++; }
  }
  const missedMonths = allExpected.filter(m => !contributionMonths.has(m));
  let currentStreak = 0;
  for (let i = allExpected.length - 1; i >= 0; i--) {
    if (contributionMonths.has(allExpected[i])) currentStreak++;
    else break;
  }
  let longest = 0, running = 0;
  for (const m of allExpected) {
    if (contributionMonths.has(m)) { running++; longest = Math.max(longest, running); }
    else running = 0;
  }

  // ── Cost basis ──
  let totalCost = 0;
  let totalBtcBought = 0;
  for (const p of purchases) {
    const cost = p.amountInvested ?? (p.btcBought * p.priceZar);
    totalCost += cost;
    totalBtcBought += p.btcBought;
  }

  // ── Contribution stats ──
  const monthlyAmounts = [...monthlyContribs.values()].map(v => v.total);
  const maxMonthlyAmount = Math.max(0, ...monthlyAmounts);
  const maxMonthKey = [...monthlyContribs.entries()].find(([, v]) => v.total === maxMonthlyAmount)?.[0] ?? '';

  return {
    monthlySnapshots: snapshots,
    memberAnalytics,
    streaks: { currentMonthlyStreak: currentStreak, longestMonthlyStreak: longest, missedMonths },
    costBasis: {
      weightedAvgZar: totalBtcBought > 0 ? Math.round(totalCost / totalBtcBought) : 0,
      totalInvestedZar: totalCost,
      totalBtc: totalBtcBought,
    },
    contributionStats: {
      avgMonthlyZar: monthlyAmounts.length > 0 ? Math.round(monthlyAmounts.reduce((a, b) => a + b, 0) / monthlyAmounts.length) : 0,
      maxMonthZar: maxMonthlyAmount,
      maxMonthLabel: maxMonthKey,
      totalMonths: monthlyAmounts.length,
    },
  };
}
