import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DataManager } from '../server/data-manager.js';

const TEST_DIR = join(import.meta.dirname!, '..', '..', '.test-data-' + process.pid);

const testData = {
  members: [
    { id: 1, name: 'Alice', joined_date: '2021-10-31', leave_date: null, status: 'active', role: 'admin' },
    { id: 2, name: 'Bob', joined_date: '2021-10-31', leave_date: null, status: 'active', role: 'member' },
    { id: 3, name: 'Charlie', joined_date: '2022-01-01', leave_date: '2023-06-01', status: 'left', role: 'member' },
  ],
  btc_purchases: [
    { date: '2022-01-15', btc_bought: 0.01, total_holdings: 0.01, price_zar: 500000, amount_invested: 5000 },
    { date: '2022-06-15', btc_bought: 0.02, total_holdings: 0.03, price_zar: 600000, amount_invested: 12000 },
  ],
  contributions: [
    { date: '2021-11-01', member_id: 1, member_name: 'Alice', amount_zar: 5000, type: 'contribution' },
    { date: '2021-11-01', member_id: 2, member_name: 'Bob', amount_zar: 3000, type: 'contribution' },
    { date: '2022-01-01', member_id: 1, member_name: 'Alice', amount_zar: 2000, type: 'contribution' },
  ],
  fund_info: {
    name: 'ZARyder Cup Ryder Cup 2031 Fund',
    target_date: '2031-09-26',
    target_amount_zar: 1000000,
    created_date: '2021-10-01',
    description: 'Pooled Bitcoin investment to fund Ryder Cup 2031 trip to Spain',
    btc_purchaser: 'Alice',
    current_btc_holdings: 0.03,
    last_purchase_date: '2022-06-15',
    member_transitions: { Frank_left: '2023-09-30', Mearp_joined: '2023-10-01' },
  },
};

function setupTestDir(): void {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, 'historical_data.json'), JSON.stringify(testData));
}

describe('DataManager', () => {
  beforeEach(() => setupTestDir());

  it('loads historical data correctly', () => {
    const dm = new DataManager(TEST_DIR);
    expect(dm.getMembers()).toHaveLength(3);
  });

  it('getMembers() returns correct shape', () => {
    const dm = new DataManager(TEST_DIR);
    const members = dm.getMembers();
    expect(members[0]).toHaveProperty('id');
    expect(members[0]).toHaveProperty('name');
    expect(members[0]).toHaveProperty('joinedDate');
    expect(members[0]).toHaveProperty('status');
  });

  it('getActiveMembers() filters correctly', () => {
    const dm = new DataManager(TEST_DIR);
    const active = dm.getActiveMembers();
    expect(active).toHaveLength(2);
    expect(active.every(m => m.status === 'active')).toBe(true);
  });

  it('getContributions() maps snake_case → camelCase', () => {
    const dm = new DataManager(TEST_DIR);
    const contribs = dm.getContributions();
    expect(contribs).toHaveLength(3);
    expect(contribs[0]).toHaveProperty('memberId');
    expect(contribs[0]).toHaveProperty('memberName');
    expect(contribs[0]).toHaveProperty('amountZar');
  });

  it('getPurchases() maps correctly', () => {
    const dm = new DataManager(TEST_DIR);
    const purchases = dm.getPurchases();
    expect(purchases).toHaveLength(2);
    expect(purchases[0]).toHaveProperty('btcBought');
    expect(purchases[0]).toHaveProperty('totalHoldings');
    expect(purchases[0]).toHaveProperty('priceZar');
  });

  it('addContribution() persists and updates summary', () => {
    const dm = new DataManager(TEST_DIR);
    const result = dm.addContribution(1, 'Alice', 1000);
    expect(result.amountZar).toBe(1000);
    expect(dm.getContributions()).toHaveLength(4);
    expect(dm.getSummary().totalContributionsZar).toBe(11000);
  });

  it('addPurchase() updates total_holdings correctly', () => {
    const dm = new DataManager(TEST_DIR);
    const result = dm.addPurchase(0.005, 700000, 3500);
    expect(result.totalHoldings).toBeCloseTo(0.035, 10);
    expect(dm.getPurchases()).toHaveLength(3);
    expect(dm.getFundInfo().currentBtcHoldings).toBeCloseTo(0.035, 10);
  });

  it('getFundInfo() returns correct shape', () => {
    const dm = new DataManager(TEST_DIR);
    const info = dm.getFundInfo();
    expect(info).toHaveProperty('name');
    expect(info).toHaveProperty('targetDate');
    expect(info).toHaveProperty('targetAmountZar');
    expect(info).toHaveProperty('currentBtcHoldings');
    expect(info).toHaveProperty('memberTransitions');
  });

  it('getSummary() calculates memberContributions correctly', () => {
    const dm = new DataManager(TEST_DIR);
    const summary = dm.getSummary();
    expect(summary.memberContributions['Alice']).toBe(7000);
    expect(summary.memberContributions['Bob']).toBe(3000);
    expect(summary.totalContributionsZar).toBe(10000);
    expect(summary.activeMembers).toBe(2);
  });

  it('getSummary() includes memberTransitions from fund_info', () => {
    const dm = new DataManager(TEST_DIR);
    const summary = dm.getSummary();
    expect(summary.memberTransitions).toEqual({ Frank_left: '2023-09-30', Mearp_joined: '2023-10-01' });
  });

  // ── Proportional shares ──
  it('getSummary() calculates proportional memberShares', () => {
    const dm = new DataManager(TEST_DIR);
    const summary = dm.getSummary();
    // Equal shares: 2 active members → 50% each
    expect(summary.memberShares['Alice'].sharePct).toBe(50);
    expect(summary.memberShares['Bob'].sharePct).toBe(50);
    expect(summary.memberShares['Alice'].btcShare).toBeCloseTo(0.015, 3);
    expect(summary.memberShares['Bob'].btcShare).toBeCloseTo(0.015, 3);
    expect(summary.memberShares['Alice'].contributedZar).toBe(7000);
  });

  it('memberShares excludes left members', () => {
    const dm = new DataManager(TEST_DIR);
    const summary = dm.getSummary();
    expect(summary.memberShares).not.toHaveProperty('Charlie');
  });

  // ── Member management ──
  it('updateMember() changes status and leaveDate', () => {
    const dm = new DataManager(TEST_DIR);
    const updated = dm.updateMember(2, { status: 'left', leaveDate: '2024-01-01' });
    expect(updated).not.toBeNull();
    expect(updated!.status).toBe('left');
    expect(updated!.leaveDate).toBe('2024-01-01');
    // Verify persisted
    const dm2 = new DataManager(TEST_DIR);
    const bob = dm2.getMemberById(2);
    expect(bob!.status).toBe('left');
  });

  it('updateMember() returns null for non-existent member', () => {
    const dm = new DataManager(TEST_DIR);
    expect(dm.updateMember(999, { status: 'left' })).toBeNull();
  });

  it('addMember() creates member with next id', () => {
    const dm = new DataManager(TEST_DIR);
    const member = dm.addMember('Dave', 'member', '2024-06-01');
    expect(member.id).toBe(4);
    expect(member.name).toBe('Dave');
    expect(member.status).toBe('active');
    expect(dm.getMembers()).toHaveLength(4);
  });

  it('addMember() persists to disk', () => {
    const dm = new DataManager(TEST_DIR);
    dm.addMember('Eve', 'admin', '2024-07-01');
    const dm2 = new DataManager(TEST_DIR);
    expect(dm2.getMembers().find(m => m.name === 'Eve')).toBeTruthy();
  });

  // ── Audit log ──
  it('addContribution() writes audit log', () => {
    const dm = new DataManager(TEST_DIR);
    dm.addContribution(1, 'Alice', 500);
    const logPath = join(TEST_DIR, 'audit-log.jsonl');
    expect(existsSync(logPath)).toBe(true);
    const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
    const entry = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
    expect(entry.action).toBe('addContribution');
    expect(entry.amountZar).toBe(500);
  });

  it('addMember() writes audit log', () => {
    const dm = new DataManager(TEST_DIR);
    dm.addMember('Frank', 'member', '2024-08-01');
    const logPath = join(TEST_DIR, 'audit-log.jsonl');
    const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
    const entry = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
    expect(entry.action).toBe('addMember');
    expect(entry.name).toBe('Frank');
  });

  it('updateMember() writes audit log', () => {
    const dm = new DataManager(TEST_DIR);
    dm.updateMember(1, { status: 'left' });
    const logPath = join(TEST_DIR, 'audit-log.jsonl');
    const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
    const entry = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
    expect(entry.action).toBe('updateMember');
  });

  it('addPurchase() writes audit log', () => {
    const dm = new DataManager(TEST_DIR);
    dm.addPurchase(0.001, 500000, 500);
    const logPath = join(TEST_DIR, 'audit-log.jsonl');
    const lines = readFileSync(logPath, 'utf-8').trim().split('\n');
    const entry = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
    expect(entry.action).toBe('addPurchase');
  });
});
