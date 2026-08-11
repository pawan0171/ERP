/**
 * Dashboard Routes
 *
 * GET /dashboard/stats            Aggregated KPI numbers
 * GET /dashboard/recent-challans  Last 5 challans with customer name
 * GET /dashboard/low-stock        Products below min threshold (paginated)
 *
 * All authenticated roles.
 */

import { Router, Response } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { parsePagination, paginate } from '../utils/pagination';
import { ok, serverError } from '../utils/response';

const router = Router();
router.use(authenticate);

// ─────────────────────────────────────────────────────────────
// GET /dashboard/stats
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    const uid = req.userId!;

    const [customers, products, challans] = await Promise.all([
      supabaseAdmin.from('customers').select('id, status').eq('user_id', uid),
      supabaseAdmin.from('products').select('id, stock_quantity, min_stock_quantity, unit_price').eq('user_id', uid),
      supabaseAdmin.from('challans').select('id, status').eq('user_id', uid),
    ]);

    const c = customers.data || [];
    const p = products.data  || [];
    const h = challans.data  || [];

    return ok(res, {
      customers: {
        total:    c.length,
        active:   c.filter((x) => x.status === 'Active').length,
        leads:    c.filter((x) => x.status === 'Lead').length,
        inactive: c.filter((x) => x.status === 'Inactive').length,
      },
      inventory: {
        total_products:  p.length,
        low_stock_count: p.filter((x) => x.stock_quantity < x.min_stock_quantity).length,
        total_stock_value: p.reduce((s, x) => s + x.unit_price * x.stock_quantity, 0),
      },
      challans: {
        total:     h.length,
        draft:     h.filter((x) => x.status === 'Draft').length,
        confirmed: h.filter((x) => x.status === 'Confirmed').length,
        cancelled: h.filter((x) => x.status === 'Cancelled').length,
      },
    });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/recent-challans
// ─────────────────────────────────────────────────────────────
router.get('/recent-challans', async (req: AuthRequest, res: Response) => {
  try {
    const limit = Math.min(20, parseInt(String(req.query.limit || '5'), 10) || 5);

    const { data, error } = await supabaseAdmin
      .from('challans')
      .select('id, challan_number, status, created_at, total_quantity, customer:customers(id, name)')
      .eq('user_id', req.userId!)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return serverError(res, error.message);

    return ok(res, { data, count: data?.length ?? 0 });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /dashboard/low-stock
// Query: page, limit
// ─────────────────────────────────────────────────────────────
router.get('/low-stock', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, from, to } = parsePagination(req);

    const { data, error, count } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, stock_quantity, min_stock_quantity, location', { count: 'exact' })
      .eq('user_id', req.userId!)
      .order('stock_quantity', { ascending: true })
      .range(from, to);

    if (error) return serverError(res, error.message);

    // Filter client-side since Supabase doesn't support cross-column comparison in select
    const lowStock = (data || []).filter((p) => p.stock_quantity < p.min_stock_quantity);

    return ok(res, paginate(lowStock, count ?? 0, page, limit));

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

export default router;
