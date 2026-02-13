import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { DataManager } from '../server/data-manager.js';
import { createRouter } from '../server/routes.js';

const TEST_DIR = join(import.meta.dirname!, '..', '..', '.test-routes-' + process.pid);

const testData = {
  members: [
    { id: 1, name: 'Alice', joined_date: '2021-10-31', leave_date: null, status: 'active', role: 'admin' },
    { id: 2, name: 'Bob', joined_date: '2021-10-31', leave_date: '2023-01-01', status: 'left', role: 'member' },
  ],
  btc_purchases: [
    { date: '2022-01-15', btc_bought: 0.01, total_holdings: 0.01, price_zar: 500000, amount_invested: 5000 },
  ],
  contributions: [
    { date: '2021-11-01', member_id: 1, member_name: 'Alice', amount_zar: 5000, type: 'contribution' },
  ],
  fund_info: {
    name: 'ZARyder Cup Ryder Cup 2031 Fund',
    target_date: '2031-09-26',
    target_amount_zar: 1000000,
    created_date: '2021-10-01',
    description: 'Pooled Bitcoin investment to fund Ryder Cup 2031 trip to Spain',
    btc_purchaser: 'Alice',
    current_btc_holdings: 0.01,
    last_purchase_date: '2022-01-15',
    member_transitions: { Rich_Nischk_left: '2024-08-31' },
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
  return app;
}

async function req(app: express.Express, method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') { server.close(); reject(new Error('bad addr')); return; }
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json', 'X-Admin-Key': '6969' } };
      if (body) opts.body = JSON.stringify(body);
      fetch(`http://127.0.0.1:${addr.port}${path}`, opts)
        .then(r => r.json().then(b => ({ status: r.status, body: b as Record<string, unknown> })))
        .then(r => { server.close(); resolve(r); })
        .catch(e => { server.close(); reject(e); });
    });
  });
}

describe('API Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('GET /api/status returns success + version', async () => {
    const r = await req(app, 'GET', '/api/status');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    const data = r.body.data as Record<string, unknown>;
    expect(data.status).toBe('online');
    expect(data.version).toBe('2.0.0');
  });

  it('GET /api/members returns array', async () => {
    const r = await req(app, 'GET', '/api/members');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
    expect((r.body.data as unknown[]).length).toBe(2);
  });

  it('GET /api/members/active filters left members', async () => {
    const r = await req(app, 'GET', '/api/members/active');
    expect(r.status).toBe(200);
    const data = r.body.data as Array<{ status: string }>;
    expect(data.length).toBe(1);
    expect(data[0].status).toBe('active');
  });

  it('GET /api/contributions returns array', async () => {
    const r = await req(app, 'GET', '/api/contributions');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('GET /api/purchases returns array', async () => {
    const r = await req(app, 'GET', '/api/purchases');
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('GET /api/fund/info returns fund info with Ryder Cup details', async () => {
    const r = await req(app, 'GET', '/api/fund/info');
    expect(r.status).toBe(200);
    const data = r.body.data as Record<string, unknown>;
    expect(data.name).toBe('ZARyder Cup Ryder Cup 2031 Fund');
    expect(data.targetDate).toBe('2031-09-26');
    expect(data).toHaveProperty('targetAmountZar');
    expect(data).toHaveProperty('memberTransitions');
  });

  it('GET /api/fund/summary returns summary with memberShares', async () => {
    const r = await req(app, 'GET', '/api/fund/summary');
    expect(r.status).toBe(200);
    const data = r.body.data as Record<string, unknown>;
    expect(data).toHaveProperty('totalContributionsZar');
    expect(data).toHaveProperty('activeMembers');
    expect(data).toHaveProperty('memberTransitions');
    expect(data).toHaveProperty('memberShares');
    expect(data).not.toHaveProperty('richNischkWithdrawal');
    expect(data).not.toHaveProperty('currentSharePerMember');
  });

  it('POST /api/contributions validates input (Zod)', async () => {
    const r = await req(app, 'POST', '/api/contributions', { memberId: -1, memberName: '', amountZar: 0 });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  it('POST /api/contributions accepts valid input', async () => {
    const r = await req(app, 'POST', '/api/contributions', { memberId: 1, memberName: 'Alice', amountZar: 500 });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
  });

  it('POST /api/purchases validates input (Zod)', async () => {
    const r = await req(app, 'POST', '/api/purchases', { btcBought: 0, priceZar: -1, amountInvested: 0 });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  it('API envelope has requestId', async () => {
    const r = await req(app, 'GET', '/api/status');
    const meta = r.body.meta as Record<string, unknown>;
    expect(meta).toHaveProperty('requestId');
    expect(typeof meta.requestId).toBe('string');
    expect((meta.requestId as string).length).toBeGreaterThan(0);
  });

  // ── Member share endpoint ──
  it('GET /api/members/:id/share returns proportional share', async () => {
    const r = await req(app, 'GET', '/api/members/1/share');
    expect(r.status).toBe(200);
    const data = r.body.data as Record<string, unknown>;
    expect(data.name).toBe('Alice');
    expect(data.sharePct).toBe(100); // Only active member
    expect(typeof data.contributedZar).toBe('number');
  });

  it('GET /api/members/:id/share returns 404 for unknown id', async () => {
    const r = await req(app, 'GET', '/api/members/999/share');
    expect(r.status).toBe(404);
  });

  it('GET /api/members/:id/share returns zero for left member with no share', async () => {
    const r = await req(app, 'GET', '/api/members/2/share');
    expect(r.status).toBe(200);
    const data = r.body.data as Record<string, unknown>;
    expect(data.sharePct).toBe(0);
  });

  // ── Member management ──
  it('POST /api/members creates a new member', async () => {
    const r = await req(app, 'POST', '/api/members', { name: 'Dave', role: 'member', joinedDate: '2024-06-01' });
    expect(r.status).toBe(201);
    const data = r.body.data as Record<string, unknown>;
    expect(data.name).toBe('Dave');
    expect(data.status).toBe('active');
    expect(data.id).toBe(3);
  });

  it('POST /api/members validates input', async () => {
    const r = await req(app, 'POST', '/api/members', { name: '', role: 'invalid', joinedDate: 'bad' });
    expect(r.status).toBe(400);
  });

  it('PATCH /api/members/:id updates member', async () => {
    const r = await req(app, 'PATCH', '/api/members/1', { status: 'left', leaveDate: '2024-12-01' });
    expect(r.status).toBe(200);
    const data = r.body.data as Record<string, unknown>;
    expect(data.status).toBe('left');
    expect(data.leaveDate).toBe('2024-12-01');
  });

  it('PATCH /api/members/:id returns 404 for unknown', async () => {
    const r = await req(app, 'PATCH', '/api/members/999', { status: 'left' });
    expect(r.status).toBe(404);
  });

  it('PATCH /api/members/:id validates input', async () => {
    const r = await req(app, 'PATCH', '/api/members/1', {});
    expect(r.status).toBe(400);
  });
});
