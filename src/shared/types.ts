/** ZARyder Cup — Shared Types */

export interface Member {
  id: number;
  name: string;
  joinedDate: string;       // ISO date
  leaveDate: string | null;
  status: 'active' | 'left';
  role: 'admin' | 'member';
}

export interface Contribution {
  date: string;             // ISO date
  memberId: number;
  memberName: string;
  amountZar: number;
  type: 'contribution';
}

export interface BtcPurchase {
  date: string;             // ISO date
  btcBought: number;
  totalHoldings: number;
  priceZar: number;
  amountInvested?: number;
  notes?: string;
  recordedAt?: string;
}

export interface FundInfo {
  name: string;
  targetDate: string;
  targetAmountZar: number;
  createdDate: string;
  description: string;
  btcPurchaser: string;
  currentBtcHoldings: number;
  lastPurchaseDate: string;
  memberTransitions: Record<string, string | number>;
}

export interface MemberShare {
  contributedZar: number;
  sharePct: number;
  btcShare: number;
}

export interface FundSummary {
  totalContributionsZar: number;
  totalBtcAcquired: number;
  numberOfPurchases: number;
  numberOfContributions: number;
  activeMembers: number;
  totalMembersAllTime: number;
  memberContributions: Record<string, number>;
  memberShares: Record<string, MemberShare>;
  dataUpdated: string;
  lastBtcPurchase: string;
  memberTransitions: Record<string, string | number>;
}

export interface BtcPrice {
  zar: number;
  usd: number;
  zar24hChange: number;
  usd24hChange: number;
  timestamp: string;
  source: string;
}

export interface PortfolioSnapshot {
  totalBtc: number;
  valueZar: number;
  valueUsd: number;
  totalInvestedZar: number;
  profitLossZar: number;
  profitLossPct: number;
  augustaProgress: number;  // 0-100%
  daysToTarget: number;
  perMemberBreakdown: Record<string, { btcShare: number; valueZar: number; sharePct: number }>;
}

/** Standard API envelope */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta: {
    timestamp: string;
    version: string;
    requestId?: string;
  };
}
