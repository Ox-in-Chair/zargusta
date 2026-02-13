/** Extended API routes — Markets, News, Trip Planning */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '..', 'data');

const API_VERSION = '2.0.0';

// ── Envelope ────────────────────────────────────────────
interface ApiMeta { timestamp: string; version: string; requestId: string }
interface ApiResponse<T> { success: boolean; data?: T; error?: string; meta: ApiMeta }

function envelope<T>(data: T): ApiResponse<T> {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } };
}

function errorEnvelope(error: string, status = 400): { body: ApiResponse<null>; status: number } {
  return {
    body: { success: false, error, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } },
    status,
  };
}

// ── Cache ───────────────────────────────────────────────
const cache = new Map<string, { data: unknown; expiry: number }>();

async function cached<T>(key: string, ttlMs: number, fetcher: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const entry = cache.get(key);
  if (entry && entry.expiry > now) return entry.data as T;
  const data = await fetcher();
  cache.set(key, { data, expiry: now + ttlMs });
  return data;
}

// Export for testing
export { cached, cache };

// ── JSON file helpers ───────────────────────────────────
function readDataFile<T>(filename: string, fallback: T): T {
  const p = join(DATA_DIR, filename);
  try {
    if (!existsSync(p)) return fallback;
    return JSON.parse(readFileSync(p, 'utf-8')) as T;
  } catch { return fallback; }
}

function writeDataFile(filename: string, data: unknown): void {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// ── Forex history tracking ──────────────────────────────
interface ForexSnapshot {
  timestamp: string;
  zarPerUsd: number | null;
  zarPerEur: number | null;
  zarPerGbp: number | null;
  zarPerChf: number | null;
}

function appendForexSnapshot(data: Record<string, unknown>): void {
  const history = readDataFile<ForexSnapshot[]>('forex-history.json', []);
  const now = new Date();
  // Only store one snapshot per hour max
  if (history.length > 0) {
    const last = new Date(history[history.length - 1].timestamp);
    if (now.getTime() - last.getTime() < 3_600_000) return;
  }
  history.push({
    timestamp: now.toISOString(),
    zarPerUsd: (data.zarPerUsd as number) ?? null,
    zarPerEur: (data.zarPerEur as number) ?? null,
    zarPerGbp: (data.zarPerGbp as number) ?? null,
    zarPerChf: (data.zarPerChf as number) ?? null,
  });
  // Keep max 30 days of hourly data (~720 entries)
  if (history.length > 720) history.splice(0, history.length - 720);
  writeDataFile('forex-history.json', history);
}

// ── External API fetchers ───────────────────────────────
async function fetchAltcoins(): Promise<unknown[]> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=zar&order=market_cap_desc&per_page=10&page=1&sparkline=true&price_change_percentage=24h,7d');
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    return await res.json() as unknown[];
  } catch {
    return [];
  }
}

const CURRENCIES: Record<string, { name: string; flag: string; region: string }> = {
  USD: { name: 'US Dollar', flag: '🇺🇸', region: 'Americas' },
  EUR: { name: 'Euro', flag: '🇪🇺', region: 'Europe' },
  GBP: { name: 'British Pound', flag: '🇬🇧', region: 'Europe' },
  CHF: { name: 'Swiss Franc', flag: '🇨🇭', region: 'Europe' },
  JPY: { name: 'Japanese Yen', flag: '🇯🇵', region: 'Asia-Pacific' },
  AUD: { name: 'Australian Dollar', flag: '🇦🇺', region: 'Asia-Pacific' },
  CAD: { name: 'Canadian Dollar', flag: '🇨🇦', region: 'Americas' },
  NZD: { name: 'New Zealand Dollar', flag: '🇳🇿', region: 'Asia-Pacific' },
  SEK: { name: 'Swedish Krona', flag: '🇸🇪', region: 'Europe' },
  NOK: { name: 'Norwegian Krone', flag: '🇳🇴', region: 'Europe' },
  DKK: { name: 'Danish Krone', flag: '🇩🇰', region: 'Europe' },
  SGD: { name: 'Singapore Dollar', flag: '🇸🇬', region: 'Asia-Pacific' },
  HKD: { name: 'Hong Kong Dollar', flag: '🇭🇰', region: 'Asia-Pacific' },
  CNY: { name: 'Chinese Yuan', flag: '🇨🇳', region: 'Asia-Pacific' },
  INR: { name: 'Indian Rupee', flag: '🇮🇳', region: 'Asia-Pacific' },
  BRL: { name: 'Brazilian Real', flag: '🇧🇷', region: 'Americas' },
  MXN: { name: 'Mexican Peso', flag: '🇲🇽', region: 'Americas' },
  KRW: { name: 'South Korean Won', flag: '🇰🇷', region: 'Asia-Pacific' },
  THB: { name: 'Thai Baht', flag: '🇹🇭', region: 'Asia-Pacific' },
  MYR: { name: 'Malaysian Ringgit', flag: '🇲🇾', region: 'Asia-Pacific' },
  IDR: { name: 'Indonesian Rupiah', flag: '🇮🇩', region: 'Asia-Pacific' },
  PHP: { name: 'Philippine Peso', flag: '🇵🇭', region: 'Asia-Pacific' },
  TWD: { name: 'Taiwan Dollar', flag: '🇹🇼', region: 'Asia-Pacific' },
  PLN: { name: 'Polish Złoty', flag: '🇵🇱', region: 'Europe' },
  CZK: { name: 'Czech Koruna', flag: '🇨🇿', region: 'Europe' },
  HUF: { name: 'Hungarian Forint', flag: '🇭🇺', region: 'Europe' },
  TRY: { name: 'Turkish Lira', flag: '🇹🇷', region: 'Middle East & Africa' },
  AED: { name: 'UAE Dirham', flag: '🇦🇪', region: 'Middle East & Africa' },
  SAR: { name: 'Saudi Riyal', flag: '🇸🇦', region: 'Middle East & Africa' },
  NGN: { name: 'Nigerian Naira', flag: '🇳🇬', region: 'Middle East & Africa' },
};

async function fetchForex(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/ZAR');
    if (!res.ok) throw new Error(`Forex ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const rates = data.rates as Record<string, number> | undefined;
    if (!rates) return { base: 'ZAR', rates: {}, currencies: [] };

    const currencies = Object.entries(CURRENCIES).map(([code, info]) => ({
      code,
      name: info.name,
      flag: info.flag,
      region: info.region,
      zarRate: rates[code] ? 1 / rates[code] : null,
    }));

    return {
      base: 'ZAR',
      rates: {
        USD: rates.USD ? 1 / rates.USD : null,
        EUR: rates.EUR ? 1 / rates.EUR : null,
        GBP: rates.GBP ? 1 / rates.GBP : null,
        CHF: rates.CHF ? 1 / rates.CHF : null,
      },
      zarPerUsd: rates.USD ? 1 / rates.USD : null,
      zarPerEur: rates.EUR ? 1 / rates.EUR : null,
      zarPerGbp: rates.GBP ? 1 / rates.GBP : null,
      zarPerChf: rates.CHF ? 1 / rates.CHF : null,
      currencies,
    };
  } catch {
    return { base: 'ZAR', rates: {}, currencies: [] };
  }
}

async function fetchFearGreed(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    if (!res.ok) throw new Error(`FearGreed ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const items = data.data as Array<Record<string, string>> | undefined;
    if (!items || items.length === 0) return { value: 50, classification: 'Neutral' };
    return { value: Number(items[0].value), classification: items[0].value_classification };
  } catch {
    return { value: 50, classification: 'Neutral' };
  }
}

async function fetchDominance(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/global');
    if (!res.ok) throw new Error(`CoinGecko global ${res.status}`);
    const data = await res.json() as Record<string, unknown>;
    const gd = data.data as Record<string, unknown> | undefined;
    if (!gd) return { btcDominance: 0 };
    const mcPct = gd.market_cap_percentage as Record<string, number> | undefined;
    return { btcDominance: mcPct?.btc ?? 0, ethDominance: mcPct?.eth ?? 0 };
  } catch {
    return { btcDominance: 0 };
  }
}

function extractSource(link: string, feedUrl: string): string {
  try {
    if (feedUrl.includes('espn.com')) return 'ESPN';
    if (feedUrl.includes('bbc')) return 'BBC';
    if (feedUrl.includes('24.com')) return 'News24';
    if (feedUrl.includes('coindesk') || feedUrl.includes('CoinDesk')) return 'CoinDesk';
    if (feedUrl.includes('autosport')) return 'Autosport';
    if (feedUrl.includes('supersport')) return 'SuperSport';
    const hostname = new URL(link || feedUrl).hostname.replace('www.', '');
    return hostname.split('.')[0].charAt(0).toUpperCase() + hostname.split('.')[0].slice(1);
  } catch { return 'Unknown'; }
}

async function fetchRss(url: string): Promise<Array<Record<string, string>>> {
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const text = await res.text();
    // Simple XML RSS parser (no dependency needed)
    const items: Array<Record<string, string>> = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;
    while ((match = itemRegex.exec(text)) !== null && items.length < 20) {
      const block = match[1];
      const getTag = (tag: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?</${tag}>`, 'is'));
        return m ? m[1].trim() : '';
      };
      // Extract image from media:content, media:thumbnail, or enclosure
      const getAttr = (tag: string, attr: string) => {
        const m = block.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"`, 'i'));
        return m ? m[1].trim() : '';
      };
      const image = getAttr('media:content', 'url')
        || getAttr('media:thumbnail', 'url')
        || getAttr('enclosure', 'url')
        || '';

      const link = getTag('link');
      items.push({
        title: getTag('title'),
        link,
        pubDate: getTag('pubDate'),
        description: getTag('description').replace(/<[^>]+>/g, '').slice(0, 200),
        source: extractSource(link, url),
        ...(image && { image }),
      });
    }
    return items;
  } catch {
    return [];
  }
}

// ── Zod schemas ─────────────────────────────────────────
const tripPlanSchema = z.object({
  tripName: z.string().min(1),
  tournamentDates: z.object({ start: z.string(), end: z.string() }),
  travelDates: z.object({ depart: z.string(), return: z.string() }),
  bookingDeadlines: z.record(z.string()),
  venue: z.string(),
  nearestAirport: z.string(),
  members: z.array(z.object({
    name: z.string(),
    passport: z.boolean(),
    visa: z.boolean(),
    insurance: z.boolean(),
    tickets: z.boolean(),
  })),
  notes: z.string().optional(),
});

const flightBookingSchema = z.object({
  memberName: z.string().min(1),
  airline: z.string().min(1),
  flightNumber: z.string().optional(),
  departDate: z.string(),
  returnDate: z.string().optional(),
  costZar: z.number().positive(),
  status: z.enum(['booked', 'pending', 'cancelled']).default('pending'),
  notes: z.string().optional(),
});

const accommodationBookingSchema = z.object({
  memberName: z.string().min(1),
  optionName: z.string().min(1),
  checkIn: z.string(),
  checkOut: z.string(),
  costZar: z.number().positive(),
  status: z.enum(['booked', 'pending', 'cancelled']).default('pending'),
  notes: z.string().optional(),
});

const budgetSchema = z.object({
  totalBudgetZar: z.number().positive(),
  currency: z.string(),
  members: z.number().int().positive(),
  categories: z.array(z.object({
    name: z.string(),
    estimatePerPerson: z.number(),
    total: z.number(),
    allocated: z.number(),
  })),
  fundedFromBtc: z.number(),
  outOfPocket: z.number(),
  scenarioModels: z.array(z.object({
    btcPriceZar: z.number().positive(),
    label: z.string(),
  })).optional(),
});

// ── Admin middleware ────────────────────────────────────
function requireAdmin(req: Request, res: Response, next: Function) {
  if (req.headers['x-admin-key'] !== '6969') {
    const err = errorEnvelope('Unauthorized', 401);
    res.status(err.status).json(err.body);
    return;
  }
  next();
}

// ── Router ──────────────────────────────────────────────
export function createExtendedRouter(dm?: any): Router {
  const router = Router();

  // ── Market endpoints ──
  router.get('/market/altcoins', async (_req: Request, res: Response) => {
    try {
      const data = await cached('altcoins', 60_000, fetchAltcoins);
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch altcoins', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/market/forex', async (_req: Request, res: Response) => {
    try {
      const data = await cached('forex', 300_000, fetchForex);
      // Persist snapshot for history tracking
      try { appendForexSnapshot(data as Record<string, unknown>); } catch { /* non-critical */ }
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch forex', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/market/forex/history', async (_req: Request, res: Response) => {
    try {
      const history = readDataFile<ForexSnapshot[]>('forex-history.json', []);
      res.json(envelope(history));
    } catch {
      const err = errorEnvelope('Failed to read forex history', 500);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/market/fear-greed', async (_req: Request, res: Response) => {
    try {
      const data = await cached('fear-greed', 3_600_000, fetchFearGreed);
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch fear & greed', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/market/dominance', async (_req: Request, res: Response) => {
    try {
      const data = await cached('dominance', 300_000, fetchDominance);
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch dominance', 502);
      res.status(err.status).json(err.body);
    }
  });

  // ── News endpoints ──
  router.get('/news/crypto', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-crypto', 300_000, () =>
        fetchRss('https://feeds.feedburner.com/CoinDesk')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch crypto news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/rugby', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-rugby', 300_000, () =>
        fetchRss('https://www.espn.com/espn/rss/rugby/news')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch rugby news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/cricket', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-cricket', 300_000, () =>
        fetchRss('https://www.espn.com/espn/rss/cricket/news')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch cricket news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/golf', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-golf', 300_000, () =>
        fetchRss('https://www.espn.com/espn/rss/golf/news')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch golf news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/world', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-world', 300_000, () =>
        fetchRss('https://feeds.bbci.co.uk/news/world/rss.xml')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch world news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/business', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-business', 300_000, () =>
        fetchRss('https://feeds.bbci.co.uk/news/business/rss.xml')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch business news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/sa', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-sa', 300_000, () =>
        fetchRss('https://feeds.24.com/articles/news24/TopStories/rss')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch SA news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/tech', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-tech', 300_000, () =>
        fetchRss('https://feeds.bbci.co.uk/news/technology/rss.xml')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch tech news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/soccer', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-soccer', 300_000, () =>
        fetchRss('https://www.espn.com/espn/rss/soccer/news')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch soccer news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/tennis', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-tennis', 300_000, () =>
        fetchRss('https://www.espn.com/espn/rss/tennis/news')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch tennis news', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/news/f1', async (_req: Request, res: Response) => {
    try {
      const data = await cached('news-f1', 300_000, () =>
        fetchRss('https://www.autosport.com/rss/feed/f1')
      );
      res.json(envelope(data));
    } catch {
      const err = errorEnvelope('Failed to fetch F1 news', 502);
      res.status(err.status).json(err.body);
    }
  });

  // ── Trip Plan ──
  router.get('/trip/plan', (_req: Request, res: Response) => {
    const data = readDataFile('trip-plan.json', {});
    res.json(envelope(data));
  });

  router.put('/trip/plan', (req: Request, res: Response) => {
    const parsed = tripPlanSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    writeDataFile('trip-plan.json', parsed.data);
    res.json(envelope(parsed.data));
  });

  // ── Flights ──
  router.get('/trip/flights', (_req: Request, res: Response) => {
    const data = readDataFile('trip-flights.json', { bookings: [] });
    res.json(envelope(data));
  });

  router.post('/trip/flights', (req: Request, res: Response) => {
    const parsed = flightBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const fileData = readDataFile<Record<string, unknown>>('trip-flights.json', { bookings: [] });
    const bookings = (fileData.bookings as unknown[]) || [];
    const booking = { id: randomUUID(), ...parsed.data, createdAt: new Date().toISOString() };
    bookings.push(booking);
    fileData.bookings = bookings;
    writeDataFile('trip-flights.json', fileData);
    res.status(201).json(envelope(booking));
  });

  // ── Accommodation ──
  router.get('/trip/accommodation', (_req: Request, res: Response) => {
    const data = readDataFile('trip-accommodation.json', { bookings: [] });
    res.json(envelope(data));
  });

  router.post('/trip/accommodation', (req: Request, res: Response) => {
    const parsed = accommodationBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const fileData = readDataFile<Record<string, unknown>>('trip-accommodation.json', { bookings: [] });
    const bookings = (fileData.bookings as unknown[]) || [];
    const booking = { id: randomUUID(), ...parsed.data, createdAt: new Date().toISOString() };
    bookings.push(booking);
    fileData.bookings = bookings;
    writeDataFile('trip-accommodation.json', fileData);
    res.status(201).json(envelope(booking));
  });

  // ── Budget ──
  router.get('/trip/budget', (_req: Request, res: Response) => {
    const data = readDataFile('trip-budget.json', {});
    res.json(envelope(data));
  });

  router.put('/trip/budget', (req: Request, res: Response) => {
    const parsed = budgetSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    writeDataFile('trip-budget.json', parsed.data);
    res.json(envelope(parsed.data));
  });

  // ── Admin: Adjust Holdings ──
  const adjustHoldingsSchema = z.object({
    holdings: z.number().positive(),
    reason: z.string().min(5),
  });

  router.post('/admin/adjust-holdings', requireAdmin, (req: Request, res: Response) => {
    const parsed = adjustHoldingsSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    // Read historical_data.json, update fund_info.current_btc_holdings
    const historical = readDataFile<Record<string, unknown>>('historical_data.json', {});
    const fundInfo = (historical.fund_info || {}) as Record<string, unknown>;
    const oldHoldings = fundInfo.current_btc_holdings;
    fundInfo.current_btc_holdings = parsed.data.holdings;
    historical.fund_info = fundInfo;
    writeDataFile('historical_data.json', historical);

    // Audit log
    const auditEntry = {
      timestamp: new Date().toISOString(),
      action: 'adjustHoldings',
      oldHoldings,
      newHoldings: parsed.data.holdings,
      reason: parsed.data.reason,
    };
    try {
      appendFileSync(join(DATA_DIR, 'audit-log.jsonl'), JSON.stringify(auditEntry) + '\n');
    } catch { /* non-critical */ }

    res.json(envelope({ holdings: parsed.data.holdings, reason: parsed.data.reason }));
  });

  // ── Admin: Audit Log ──
  // ── Fund Ledger (unified transaction history) ──────────────
  router.get('/fund/ledger', requireAdmin, (req: Request, res: Response) => {
    try {
      if (!dm) { res.status(500).json({ success: false, error: 'DataManager not available', meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } }); return; }
      const contributions = dm.getContributions();
      const purchases = dm.getPurchases();

      const typeFilter = (req.query.type as string) || 'all';
      const memberFilter = (req.query.member as string) || '';

      type LedgerEntry = {
        date: string;
        type: 'contribution' | 'purchase';
        member: string | null;
        amountZar: number;
        btc: number | null;
        priceZar: number | null;
        notes: string;
      };

      const ledger: LedgerEntry[] = [];

      for (const c of contributions) {
        if (typeFilter !== 'all' && typeFilter !== 'contribution') continue;
        if (memberFilter && c.memberName !== memberFilter) continue;
        ledger.push({
          date: c.date,
          type: 'contribution',
          member: c.memberName,
          amountZar: c.amountZar,
          btc: null,
          priceZar: null,
          notes: '',
        });
      }

      for (const p of purchases) {
        if (typeFilter !== 'all' && typeFilter !== 'purchase') continue;
        ledger.push({
          date: p.date,
          type: 'purchase',
          member: null,
          amountZar: p.amountInvested || 0,
          btc: p.btcBought,
          priceZar: p.priceZar,
          notes: p.notes || '',
        });
      }

      ledger.sort((a, b) => b.date.localeCompare(a.date));

      const page = Math.max(1, Number(req.query.page) || 1);
      const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50));
      const total = ledger.length;
      const paged = ledger.slice((page - 1) * limit, page * limit);

      res.json(envelope({
        entries: paged,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      }));
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } });
    }
  });

  router.get('/admin/audit-log', requireAdmin, (_req: Request, res: Response) => {
    try {
      const logPath = join(DATA_DIR, 'audit-log.jsonl');
      if (!existsSync(logPath)) {
        res.json(envelope([]));
        return;
      }
      const content = readFileSync(logPath, 'utf-8');
      const entries = content.trim().split('\n').filter(Boolean).map((line: string) => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(Boolean);
      res.json(envelope(entries));
    } catch {
      res.json(envelope([]));
    }
  });

  return router;
}
