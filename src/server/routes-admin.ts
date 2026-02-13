/** Admin API routes — Treasurer portal */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { DataManager } from './data-manager.js';

const API_VERSION = '2.0.0';
const ADMIN_KEY = '6969';

function envelope<T>(data: T) {
  return { success: true, data, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } };
}

function errorEnvelope(error: string, status = 400) {
  return {
    body: { success: false, error, meta: { timestamp: new Date().toISOString(), version: API_VERSION, requestId: randomUUID() } },
    status,
  };
}

function requireAdmin(req: Request, res: Response, next: () => void): void {
  if (req.headers['x-admin-key'] !== ADMIN_KEY) {
    const err = errorEnvelope('Unauthorized — admin key required', 401);
    res.status(err.status).json(err.body);
    return;
  }
  next();
}

const adjustSchema = z.object({
  newHoldings: z.number().nonnegative(),
  reason: z.string().min(1),
});

const bulkPaymentSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payments: z.array(z.object({
    memberId: z.number().int().positive(),
    memberName: z.string().min(1),
    amountZar: z.number().positive(),
  })).min(1),
});

export function createAdminRouter(dm: DataManager): Router {
  const router = Router();

  // All admin routes require key
  router.use(requireAdmin);

  // ── Adjust Holdings ──
  router.post('/admin/adjust-holdings', (req: Request, res: Response) => {
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const result = dm.adjustHoldings(parsed.data.newHoldings, parsed.data.reason);
    res.json(envelope(result));
  });

  // ── Bulk Payment Round ──
  router.post('/admin/bulk-payment', (req: Request, res: Response) => {
    const parsed = bulkPaymentSchema.safeParse(req.body);
    if (!parsed.success) {
      const err = errorEnvelope(parsed.error.issues.map(i => i.message).join('; '));
      res.status(err.status).json(err.body);
      return;
    }
    const results: Array<{ memberName: string; amountZar: number }> = [];
    for (const p of parsed.data.payments) {
      dm.addContribution(p.memberId, p.memberName, p.amountZar);
      results.push({ memberName: p.memberName, amountZar: p.amountZar });
    }
    const totalZar = results.reduce((s, r) => s + r.amountZar, 0);
    res.json(envelope({ date: parsed.data.date, paymentsRecorded: results.length, totalZar, payments: results }));
  });

  // ── Audit Log ──
  router.get('/admin/audit-log', (req: Request, res: Response) => {
    const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));
    const log = dm.getAuditLog(limit);
    res.json(envelope(log));
  });

  return router;
}
