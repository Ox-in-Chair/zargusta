/** API routes */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { DataManager } from './data-manager.js';
import { getCurrentBtcPrice, getBtcHistory } from './btc-price.js';
import { calculatePortfolio } from './portfolio.js';
import type { ApiResponse } from '../shared/types.js';

const API_VERSION = '2.0.0';
const ADMIN_KEY = '6969';

/** Middleware: require X-Admin-Key header on mutation endpoints */
function requireAdmin(req: Request, res: Response, next: () => void): void {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    const err = errorEnvelope('Unauthorized — admin key required', 401);
    res.status(err.status).json(err.body);
    return;
  }
  next();
}

function envelope<T>(data: T): ApiResponse<T> {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } };
}

function errorEnvelope(error: string, status = 400): { body: ApiResponse<null>; status: number } {
  return {
    body: { success: false, error, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } },
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

  router.get('/members/:id/share', (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      const err = errorEnvelope('Invalid member id');
      res.status(err.status).json(err.body);
      return;
    }
    const member = dm.getMemberById(id);
    if (!member) {
      const err = errorEnvelope('Member not found', 404);
      res.status(err.status).json(err.body);
      return;
    }
    const summary = dm.getSummary();
    const share = summary.memberShares[member.name];
    if (!share) {
      res.json(envelope({ memberId: id, name: member.name, contributedZar: 0, sharePct: 0, btcShare: 0 }));
      return;
    }
    res.json(envelope({ memberId: id, name: member.name, ...share }));
  });

  const updateMemberSchema = z.object({
    status: z.enum(['active', 'left']).optional(),
    leaveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).refine(d => d.status !== undefined || d.leaveDate !== undefined, { message: 'At least one field required' });

  router.patch('/members/:id', requireAdmin, (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      const err = errorEnvelope('Invalid member id');
      res.status(err.status).json(err.body);
      return;
    }
    const parsed = updateMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const result = dm.updateMember(id, parsed.data);
    if (!result) {
      const err = errorEnvelope('Member not found', 404);
      res.status(err.status).json(err.body);
      return;
    }
    res.json(envelope(result));
  });

  const addMemberSchema = z.object({
    name: z.string().min(1),
    role: z.enum(['admin', 'member']),
    joinedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  router.post('/members', requireAdmin, (req: Request, res: Response) => {
    const parsed = addMemberSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const { name, role, joinedDate } = parsed.data;
    const result = dm.addMember(name, role, joinedDate);
    res.status(201).json(envelope(result));
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

  router.post('/contributions', requireAdmin, (req: Request, res: Response) => {
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

  router.post('/purchases', requireAdmin, (req: Request, res: Response) => {
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
