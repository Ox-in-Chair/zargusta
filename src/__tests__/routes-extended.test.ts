import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import { mkdirSync, writeFileSync, rmSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createExtendedRouter, cache } from '../server/routes-extended.js';
import { readFileSync, existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

// Backup files that tests mutate, restore in afterAll
const MUTABLE_FILES = ['trip-plan.json', 'trip-flights.json', 'trip-accommodation.json', 'trip-budget.json'];
const backups = new Map<string, string>();

function backupDataFiles() {
  for (const f of MUTABLE_FILES) {
    const p = join(DATA_DIR, f);
    if (existsSync(p)) backups.set(f, readFileSync(p, 'utf-8'));
  }
}

function restoreDataFiles() {
  for (const [f, content] of backups) {
    writeFileSync(join(DATA_DIR, f), content, 'utf-8');
  }
}

function buildApp(): express.Express {
  const app = express();
  app.use(express.json());
  app.use('/api', createExtendedRouter());
  return app;
}

async function req(app: express.Express, method: string, path: string, body?: unknown, extraHeaders?: Record<string, string>) {
  return new Promise<{ status: number; body: Record<string, unknown> }>((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') { server.close(); reject(new Error('bad addr')); return; }
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json', ...extraHeaders } };
      if (body) opts.body = JSON.stringify(body);
      fetch(`http://127.0.0.1:${addr.port}${path}`, opts)
        .then(r => r.json().then(b => ({ status: r.status, body: b as Record<string, unknown> })))
        .then(r => { server.close(); resolve(r); })
        .catch(e => { server.close(); reject(e); });
    });
  });
}

describe('Extended API Routes', () => {
  let app: express.Express;

  beforeAll(() => {
    backupDataFiles();
    app = buildApp();
  });

  afterAll(() => {
    restoreDataFiles();
  });

  beforeEach(() => {
    cache.clear();
  });

  // ── Trip Plan ──
  it('GET /api/trip/plan returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/trip/plan');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.meta).toBeDefined();
    const meta = r.body.meta as Record<string, unknown>;
    expect(meta.requestId).toBeDefined();
  });

  it('GET /api/trip/plan returns trip data', async () => {
    const r = await req(app, 'GET', '/api/trip/plan');
    const data = r.body.data as Record<string, unknown>;
    expect(data.tripName).toBeDefined();
    expect(data.members).toBeDefined();
  });

  it('PUT /api/trip/plan validates input', async () => {
    const r = await req(app, 'PUT', '/api/trip/plan', { invalid: true });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  it('PUT /api/trip/plan accepts valid data', async () => {
    const validPlan = {
      tripName: 'Test Trip',
      tournamentDates: { start: '2031-09-26', end: '2031-09-28' },
      travelDates: { depart: '2031-09-23', return: '2031-09-30' },
      bookingDeadlines: { flights: '2031-03-01' },
      venue: 'Test Venue',
      nearestAirport: 'BCN',
      members: [{ name: 'Test', passport: true, visa: false, insurance: false, tickets: false }],
    };
    const r = await req(app, 'PUT', '/api/trip/plan', validPlan);
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  // ── Flights ──
  it('GET /api/trip/flights returns success', async () => {
    const r = await req(app, 'GET', '/api/trip/flights');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('POST /api/trip/flights validates input', async () => {
    const r = await req(app, 'POST', '/api/trip/flights', { bad: true });
    expect(r.status).toBe(400);
    expect(r.body.success).toBe(false);
  });

  it('POST /api/trip/flights accepts valid booking', async () => {
    const r = await req(app, 'POST', '/api/trip/flights', {
      memberName: 'Ox',
      airline: 'Turkish Airlines',
      departDate: '2031-09-23',
      costZar: 25000,
    });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
    const data = r.body.data as Record<string, unknown>;
    expect(data.id).toBeDefined();
    expect(data.memberName).toBe('Ox');
  });

  // ── Accommodation ──
  it('GET /api/trip/accommodation returns success', async () => {
    const r = await req(app, 'GET', '/api/trip/accommodation');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('POST /api/trip/accommodation validates input', async () => {
    const r = await req(app, 'POST', '/api/trip/accommodation', {});
    expect(r.status).toBe(400);
  });

  it('POST /api/trip/accommodation accepts valid booking', async () => {
    const r = await req(app, 'POST', '/api/trip/accommodation', {
      memberName: 'Greg',
      optionName: 'Venue Hotel',
      checkIn: '2031-09-23',
      checkOut: '2031-09-30',
      costZar: 35000,
    });
    expect(r.status).toBe(201);
    expect(r.body.success).toBe(true);
  });

  // ── Budget ──
  it('GET /api/trip/budget returns success', async () => {
    const r = await req(app, 'GET', '/api/trip/budget');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('PUT /api/trip/budget validates input', async () => {
    const r = await req(app, 'PUT', '/api/trip/budget', { bad: true });
    expect(r.status).toBe(400);
  });

  it('PUT /api/trip/budget accepts valid data', async () => {
    const r = await req(app, 'PUT', '/api/trip/budget', {
      totalBudgetZar: 1000000,
      currency: 'ZAR',
      members: 7,
      categories: [{ name: 'Flights', estimatePerPerson: 25000, total: 175000, allocated: 0 }],
      fundedFromBtc: 0,
      outOfPocket: 0,
    });
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  // ── Market endpoints (may return empty due to network, but should not error) ──
  it('GET /api/market/altcoins returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/market/altcoins');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(r.body.meta).toBeDefined();
  });

  it('GET /api/market/forex returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/market/forex');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('GET /api/market/forex/history returns success envelope with array', async () => {
    const r = await req(app, 'GET', '/api/market/forex/history');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
    expect(Array.isArray(r.body.data)).toBe(true);
  });

  it('GET /api/market/fear-greed returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/market/fear-greed');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('GET /api/market/dominance returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/market/dominance');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  // ── News endpoints ──
  it('GET /api/news/crypto returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/news/crypto');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('GET /api/news/rugby returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/news/rugby');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('GET /api/news/cricket returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/news/cricket');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  it('GET /api/news/golf returns success envelope', async () => {
    const r = await req(app, 'GET', '/api/news/golf');
    expect(r.status).toBe(200);
    expect(r.body.success).toBe(true);
  });

  // ── Envelope format ──
  it('All endpoints have requestId in meta', async () => {
    const endpoints = ['/api/trip/plan', '/api/trip/flights', '/api/trip/budget'];
    for (const ep of endpoints) {
      const r = await req(app, 'GET', ep);
      const meta = r.body.meta as Record<string, unknown>;
      expect(meta.requestId).toBeDefined();
      expect(typeof meta.requestId).toBe('string');
    }
  });

  it('GET /api/fund/ledger returns paginated entries with admin key', async () => {
    const mockDm = {
      getContributions: () => [
        { date: '2025-01-01', memberName: 'Alice', amountZar: 500, type: 'contribution' },
        { date: '2025-02-01', memberName: 'Bob', amountZar: 300, type: 'contribution' },
      ],
      getPurchases: () => [
        { date: '2025-01-15', btcBought: 0.005, priceZar: 800000, amountInvested: 4000, notes: 'DCA' },
      ],
    };
    const dmApp = express();
    dmApp.use(express.json());
    dmApp.use('/api', createExtendedRouter(mockDm));

    const r = await req(dmApp, 'GET', '/api/fund/ledger', undefined, { 'X-Admin-Key': '6969' });
    expect(r.body.success).toBe(true);
    const data = r.body.data as any;
    expect(data.entries).toHaveLength(3);
    expect(data.total).toBe(3);
    expect(data.pages).toBe(1);
    // Sorted by date desc
    expect(data.entries[0].date).toBe('2025-02-01');
  });

  it('GET /api/fund/ledger filters by type', async () => {
    const mockDm = {
      getContributions: () => [{ date: '2025-01-01', memberName: 'Alice', amountZar: 500, type: 'contribution' }],
      getPurchases: () => [{ date: '2025-01-15', btcBought: 0.005, priceZar: 800000, amountInvested: 4000, notes: '' }],
    };
    const dmApp = express();
    dmApp.use(express.json());
    dmApp.use('/api', createExtendedRouter(mockDm));

    const r = await req(dmApp, 'GET', '/api/fund/ledger?type=purchase', undefined, { 'X-Admin-Key': '6969' });
    expect(r.body.success).toBe(true);
    expect((r.body.data as any).entries).toHaveLength(1);
    expect((r.body.data as any).entries[0].type).toBe('purchase');
  });
});
