import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DataManager } from '../server/data-manager.js';
import { createRouter } from '../server/routes.js';
import { createAdminRouter } from '../server/routes-admin.js';

const TEST_DIR = join(import.meta.dirname!, '..', '..', '.test-admin-' + process.pid);

const testData = {
  members: [
    { id: 1, name: 'Alice', joined_date: '2021-10-31', leave_date: null, status: 'active', role: 'admin' },
  ],
  btc_purchases: [
    { date: '2022-01-15', btc_bought: 0.01, total_holdings: 0.01, price_zar: 500000, amount_invested: 5000 },
  ],
  contributions: [
    { date: '2021-11-01', member_id: 1, member_name: 'Alice', amount_zar: 5000, type: 'contribution' },
  ],
  fund_info: {
    name: 'Test Fund', target_date: '2031-09-26', target_amount_zar: 1000000,
    created_date: '2021-10-01', description: 'Test', btc_purchaser: 'Alice',
    current_btc_holdings: 0.01, last_purchase_date: '2022-01-15', member_transitions: {},
  },
};

function buildApp(): express.Express {
  rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, 'historical_data.json'), JSON.stringify(testData));
  const app = express();
  app.use(express.json());
  const dm = new DataManager(TEST_DIR);
  app.use('/api', createRouter(dm));
  app.use('/api', createAdminRouter(dm));
  return app;
}

async function req(app: express.Express, method: string, path: string, body?: unknown, headers?: Record<string, string>) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') { server.close(); reject(new Error('bad addr')); return; }
      const h: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
      const opts: RequestInit = { method, headers: h };
      if (body) opts.body = JSON.stringify(body);
      fetch(`http://127.0.0.1:${addr.port}${path}`, opts)
        .then(r => r.json().then(b => ({ status: r.status, body: b as Record<string, unknown> })))
        .then(r => { server.close(); resolve(r); })
        .catch(e => { server.close(); reject(e); });
    });
  });
}

const ADMIN = { 'X-Admin-Key': '6969' };

describe('Admin Routes', () => {
  let app: express.Express;

  beforeAll(() => { app = buildApp(); });
  afterAll(() => { rmSync(TEST_DIR, { recursive: true, force: true }); });

  // ── Auth ──
  it('rejects admin endpoints without key', async () => {
    const r = await req(app, 'POST', '/api/admin/adjust-holdings', { newHoldings: 0.02, reason: 'test' });
    expect(r.status).toBe(401);
  });

  it('rejects admin endpoints with wrong key', async () => {
    const r = await req(app, 'POST', '/api/admin/adjust-holdings', { newHoldings: 0.02, reason: 'test' }, { 'X-Admin-Key': 'wrong' });
    expect(r.status).toBe(401);
  });

  // ── Adjust Holdings ──
  it('adjusts holdings with valid key', async () => {
    const r = await req(app, 'POST', '/api/admin/adjust-holdings', { newHoldings: 0.025, reason: 'reconciliation' }, ADMIN);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    const data = r.body.data as Record<string, unknown>;
    expect(data.previous).toBe(0.01);
    expect(data.current).toBe(0.025);
  });

  it('validates adjust holdings input', async () => {
    const r = await req(app, 'POST', '/api/admin/adjust-holdings', { newHoldings: -1, reason: '' }, ADMIN);
    expect(r.status).toBe(400);
  });

  // ── Audit Log ──
  it('returns audit log', async () => {
    const r = await req(app, 'GET', '/api/admin/audit-log', undefined, ADMIN);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
    const log = r.body.data as Array<Record<string, unknown>>;
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].action).toBe('adjustHoldings');
  });

  it('rejects audit log without key', async () => {
    const r = await req(app, 'GET', '/api/admin/audit-log');
    expect(r.status).toBe(401);
  });

  // ── Mutation endpoints require admin key ──
  it('POST /api/contributions requires admin key', async () => {
    const r = await req(app, 'POST', '/api/contributions', { memberId: 1, memberName: 'Alice', amountZar: 100 });
    expect(r.status).toBe(401);
  });

  it('POST /api/contributions works with admin key', async () => {
    const r = await req(app, 'POST', '/api/contributions', { memberId: 1, memberName: 'Alice', amountZar: 100 }, ADMIN);
    expect(r.status).toBe(201);
  });

  it('POST /api/purchases requires admin key', async () => {
    const r = await req(app, 'POST', '/api/purchases', { btcBought: 0.001, priceZar: 500000, amountInvested: 500 });
    expect(r.status).toBe(401);
  });

  it('POST /api/members requires admin key', async () => {
    const r = await req(app, 'POST', '/api/members', { name: 'Bob', role: 'member', joinedDate: '2024-01-01' });
    expect(r.status).toBe(401);
  });

  it('PATCH /api/members/:id requires admin key', async () => {
    const r = await req(app, 'PATCH', '/api/members/1', { status: 'left', leaveDate: '2025-01-01' });
    expect(r.status).toBe(401);
  });
});
