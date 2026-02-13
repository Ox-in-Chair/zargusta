/** Data manager — JSON file persistence (migrated from Python DataManager) */
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Member, Contribution, BtcPurchase, FundInfo, FundSummary, MemberShare } from '../shared/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', '..', 'src', 'data');

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, data: unknown): void {
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Raw historical data shape (snake_case from legacy) ──────────────
interface RawHistorical {
  members: Array<{
    id: number; name: string; joined_date: string;
    leave_date: string | null; status: string; role: string;
  }>;
  btc_purchases: Array<{
    date: string; btc_bought: number; total_holdings: number;
    price_zar: number; amount_invested?: number; notes?: string;
    recorded_at?: string;
  }>;
  contributions: Array<{
    date: string; member_id: number; member_name: string;
    amount_zar: number; type: string;
  }>;
  fund_info: {
    name: string; target_date: string; target_amount_zar: number;
    created_date: string; description: string; btc_purchaser: string;
    current_btc_holdings: number; last_purchase_date: string;
    member_transitions: Record<string, string | number>;
  };
}

export class DataManager {
  private dataDir: string;
  private historicalPath: string;
  private summaryPath: string;
  private raw: RawHistorical;
  private summary: FundSummary;

  constructor(dataDir = DATA_DIR) {
    this.dataDir = dataDir;
    ensureDir(this.dataDir);
    this.historicalPath = join(this.dataDir, 'historical_data.json');
    this.summaryPath = join(this.dataDir, 'fund_summary.json');
    this.raw = readJson<RawHistorical>(this.historicalPath, {
      members: [], btc_purchases: [], contributions: [],
      fund_info: {} as RawHistorical['fund_info'],
    });
    this.summary = this.buildSummary();
  }

  // ── Public API ──────────────────────────────────────────────────

  getMembers(): Member[] {
    return this.raw.members.map(m => ({
      id: m.id,
      name: m.name,
      joinedDate: m.joined_date,
      leaveDate: m.leave_date,
      status: m.status as Member['status'],
      role: m.role as Member['role'],
    }));
  }

  getActiveMembers(): Member[] {
    return this.getMembers().filter(m => m.status === 'active');
  }

  getMemberById(id: number): Member | undefined {
    return this.getMembers().find(m => m.id === id);
  }

  getContributions(): Contribution[] {
    return this.raw.contributions.map(c => ({
      date: c.date,
      memberId: c.member_id,
      memberName: c.member_name,
      amountZar: c.amount_zar,
      type: 'contribution',
    }));
  }

  getPurchases(): BtcPurchase[] {
    return this.raw.btc_purchases.map(p => ({
      date: p.date,
      btcBought: p.btc_bought,
      totalHoldings: p.total_holdings,
      priceZar: p.price_zar,
      amountInvested: p.amount_invested,
      notes: p.notes,
      recordedAt: p.recorded_at,
    }));
  }

  getFundInfo(): FundInfo {
    const fi = this.raw.fund_info;
    return {
      name: fi.name,
      targetDate: fi.target_date,
      targetAmountZar: fi.target_amount_zar,
      createdDate: fi.created_date,
      description: fi.description,
      btcPurchaser: fi.btc_purchaser,
      currentBtcHoldings: fi.current_btc_holdings,
      lastPurchaseDate: fi.last_purchase_date,
      memberTransitions: fi.member_transitions,
    };
  }

  getSummary(): FundSummary {
    return this.summary;
  }

  // ── Mutations ───────────────────────────────────────────────────

  addContribution(memberId: number, memberName: string, amountZar: number): Contribution {
    const entry = {
      date: new Date().toISOString().slice(0, 10),
      member_id: memberId,
      member_name: memberName,
      amount_zar: amountZar,
      type: 'contribution' as const,
    };
    this.raw.contributions.push(entry);
    this.persist();
    this.auditLog('addContribution', { memberId, memberName, amountZar });
    return { date: entry.date, memberId, memberName, amountZar, type: 'contribution' };
  }

  addPurchase(btcBought: number, priceZar: number, amountInvested: number, notes = ''): BtcPurchase {
    const lastHoldings = this.raw.btc_purchases.length > 0
      ? this.raw.btc_purchases[this.raw.btc_purchases.length - 1].total_holdings
      : 0;
    const entry = {
      date: new Date().toISOString().slice(0, 10),
      btc_bought: btcBought,
      total_holdings: lastHoldings + btcBought,
      price_zar: priceZar,
      amount_invested: amountInvested,
      notes,
      recorded_at: new Date().toISOString(),
    };
    this.raw.btc_purchases.push(entry);
    this.raw.fund_info.current_btc_holdings = entry.total_holdings;
    this.raw.fund_info.last_purchase_date = entry.date;
    this.persist();
    this.auditLog('addPurchase', { btcBought, priceZar, amountInvested, notes });
    return {
      date: entry.date, btcBought, totalHoldings: entry.total_holdings,
      priceZar, amountInvested, notes, recordedAt: entry.recorded_at,
    };
  }

  updateMember(id: number, patch: { status?: 'active' | 'left'; leaveDate?: string }): Member | null {
    const raw = this.raw.members.find(m => m.id === id);
    if (!raw) return null;
    if (patch.status !== undefined) raw.status = patch.status;
    if (patch.leaveDate !== undefined) raw.leave_date = patch.leaveDate;
    this.persist();
    this.auditLog('updateMember', { id, patch });
    return this.getMemberById(id) ?? null;
  }

  addMember(name: string, role: string, joinedDate: string): Member {
    const maxId = this.raw.members.reduce((mx, m) => Math.max(mx, m.id), 0);
    const raw = {
      id: maxId + 1,
      name,
      joined_date: joinedDate,
      leave_date: null,
      status: 'active',
      role,
    };
    this.raw.members.push(raw);
    this.persist();
    this.auditLog('addMember', { name, role, joinedDate, id: raw.id });
    return {
      id: raw.id, name, joinedDate, leaveDate: null,
      status: 'active', role: role as Member['role'],
    };
  }

  // ── Internal ────────────────────────────────────────────────────

  private buildSummary(): FundSummary {
    const memberContribs: Record<string, number> = {};
    for (const c of this.raw.contributions) {
      memberContribs[c.member_name] = (memberContribs[c.member_name] ?? 0) + c.amount_zar;
    }
    // Credit buyouts: buyer absorbs seller's contributions, seller goes to 0
    const buyouts = (this.raw.fund_info as Record<string, unknown>).buyouts as Array<{ buyer: string; seller: string; amount_zar: number }> | undefined;
    if (buyouts) {
      for (const b of buyouts) {
        memberContribs[b.buyer] = (memberContribs[b.buyer] ?? 0) + b.amount_zar;
        memberContribs[b.seller] = 0;
      }
    }
    const totalZar = Object.values(memberContribs).reduce((a, b) => a + b, 0);
    const activeMembers = this.raw.members.filter(m => m.status === 'active');
    const activeCount = activeMembers.length;
    const holdings = this.raw.fund_info.current_btc_holdings ?? 0;

    // Equal share calculation — all active members get the same slice
    // Ox mandate 2026-02-13: "Every member has equal share. The past is the past."
    const equalSharePct = activeCount > 0 ? 100 / activeCount : 0;
    const equalBtcShare = activeCount > 0 ? holdings / activeCount : 0;

    const memberShares: Record<string, MemberShare> = {};
    for (const m of activeMembers) {
      const contributed = memberContribs[m.name] ?? 0;
      memberShares[m.name] = { contributedZar: contributed, sharePct: equalSharePct, btcShare: equalBtcShare };
    }

    return {
      totalContributionsZar: totalZar,
      totalBtcAcquired: holdings,
      numberOfPurchases: this.raw.btc_purchases.length,
      numberOfContributions: this.raw.contributions.length,
      activeMembers: activeCount,
      totalMembersAllTime: this.raw.members.length,
      memberContributions: memberContribs,
      memberShares,
      dataUpdated: new Date().toISOString(),
      lastBtcPurchase: this.raw.fund_info.last_purchase_date ?? '',
      memberTransitions: this.raw.fund_info.member_transitions ?? {},
    };
  }

  adjustHoldings(newHoldings: number, reason: string): { previous: number; current: number; reason: string } {
    const previous = this.raw.fund_info.current_btc_holdings;
    this.raw.fund_info.current_btc_holdings = newHoldings;
    this.persist();
    this.auditLog('adjustHoldings', { previous, current: newHoldings, reason });
    return { previous, current: newHoldings, reason };
  }

  getAuditLog(limit = 50): Array<Record<string, unknown>> {
    try {
      const logPath = join(this.dataDir, 'audit-log.jsonl');
      if (!existsSync(logPath)) return [];
      const lines = readFileSync(logPath, 'utf-8').trim().split('\n').filter(Boolean);
      return lines.slice(-limit).reverse().map(line => {
        try { return JSON.parse(line); } catch { return { raw: line }; }
      });
    } catch {
      return [];
    }
  }

  private persist(): void {
    writeJson(this.historicalPath, this.raw);
    this.summary = this.buildSummary();
    writeJson(this.summaryPath, this.summary);
  }

  private auditLog(action: string, detail: Record<string, unknown>): void {
    const entry = { timestamp: new Date().toISOString(), action, ...detail };
    try {
      appendFileSync(join(this.dataDir, 'audit-log.jsonl'), JSON.stringify(entry) + '\n');
    } catch {
      // Non-critical — don't crash on audit log failure
    }
  }
}
