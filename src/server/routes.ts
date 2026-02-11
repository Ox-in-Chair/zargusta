/** API routes */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { DataManager } from './data-manager.js';
import { getCurrentBtcPrice, getBtcHistory } from './btc-price.js';
import { calculatePortfolio } from './portfolio.js';
import type { ApiResponse } from '../shared/types.js';

const API_VERSION = '2.0.0';

function envelope<T>(data: T): ApiResponse<T> {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), version: API_VERSION } };
}

function errorEnvelope(error: string, status = 400): { body: ApiResponse<null>; status: number } {
  return {
    body: { success: false, error, meta: { timestamp: new Date().toISOString(), version: API_VERSION } },
    status,
  };
}

export function createRouter(dm: DataManager): Router {
  const router = Router();

  // ── Status ──
  router.get('/status', (_req: Request, res: Response) => {
    res.json(envelope({ status: 'online', version: API_VERSION }));
  });

  // ── Members ──
  router.get('/members', (_req: Request, res: Response) => {
    res.json(envelope(dm.getMembers()));
  });

  router.get('/members/active', (_req: Request, res: Response) => {
    res.json(envelope(dm.getActiveMembers()));
  });

  // ── Contributions ──
  router.get('/contributions', (_req: Request, res: Response) => {
    res.json(envelope(dm.getContributions()));
  });

  const addContribSchema = z.object({
    memberId: z.number().int().positive(),
    memberName: z.string().min(1),
    amountZar: z.number().positive(),
  });

  router.post('/contributions', (req: Request, res: Response) => {
    const parsed = addContribSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const { memberId, memberName, amountZar } = parsed.data;
    const result = dm.addContribution(memberId, memberName, amountZar);
    res.status(201).json(envelope(result));
  });

  // ── Purchases ──
  router.get('/purchases', (_req: Request, res: Response) => {
    res.json(envelope(dm.getPurchases()));
  });

  const addPurchaseSchema = z.object({
    btcBought: z.number().positive(),
    priceZar: z.number().positive(),
    amountInvested: z.number().positive(),
    notes: z.string().optional(),
  });

  router.post('/purchases', (req: Request, res: Response) => {
    const parsed = addPurchaseSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const { btcBought, priceZar, amountInvested, notes } = parsed.data;
    const result = dm.addPurchase(btcBought, priceZar, amountInvested, notes);
    res.status(201).json(envelope(result));
  });

  // ── Fund ──
  router.get('/fund/info', (_req: Request, res: Response) => {
    res.json(envelope(dm.getFundInfo()));
  });

  router.get('/fund/summary', (_req: Request, res: Response) => {
    res.json(envelope(dm.getSummary()));
  });

  // ── Portfolio (live) ──
  router.get('/portfolio', async (_req: Request, res: Response) => {
    try {
      const price = await getCurrentBtcPrice();
      const snapshot = calculatePortfolio(dm.getSummary(), dm.getFundInfo(), price);
      res.json(envelope({ ...snapshot, price }));
    } catch {
      const err = errorEnvelope('Failed to calculate portfolio', 500);
      res.status(err.status).json(err.body);
    }
  });

  // ── BTC Price ──
  router.get('/btc/price', async (_req: Request, res: Response) => {
    try {
      res.json(envelope(await getCurrentBtcPrice()));
    } catch {
      const err = errorEnvelope('Price fetch failed', 502);
      res.status(err.status).json(err.body);
    }
  });

  router.get('/btc/history', async (req: Request, res: Response) => {
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    res.json(envelope(await getBtcHistory(days)));
  });

  return router;
}
