/**
 * Challan Routes
 *
 * GET    /challans                  List challans (paginated + search + filter)
 * GET    /challans/:id              Get single challan with items
 * POST   /challans                  Create draft challan
 * POST   /challans/:id/confirm      Confirm challan + deduct stock
 * POST   /challans/:id/cancel       Cancel draft challan
 * DELETE /challans/:id              Hard delete (admin only)
 *
 * Allowed roles: admin, sales, accounts
 */

import { Router, Response } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { authenticate, requireRole, AuthRequest } from '../middleware/authenticate';
import {
  validate,
  required,
  isOneOf,
  isPositiveInteger,
  ValidationException,
} from '../utils/validation';
import { parsePagination, paginate } from '../utils/pagination';
import { ok, created, notFound, serverError, validationError, badRequest } from '../utils/response';

const router = Router();
router.use(authenticate);

const canAccess = requireRole('admin', 'sales', 'accounts');

// ─────────────────────────────────────────────────────────────
// GET /challans
// Query: page, limit, search, status, customer_id
// ─────────────────────────────────────────────────────────────
router.get('/', canAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, from, to } = parsePagination(req);
    const {
      search,
      status,
      customer_id,
      sort_by  = 'created_at',
      sort_dir = 'desc',
    } = req.query as Record<string, string>;

    const VALID_STATUS = ['Draft', 'Confirmed', 'Cancelled'];
    const SORTABLE     = ['created_at', 'challan_number', 'total_quantity', 'status'];
    const safeSort     = SORTABLE.includes(sort_by) ? sort_by : 'created_at';
    const ascending    = sort_dir === 'asc';

    let query = supabaseAdmin
      .from('challans')
      .select(
        '*, customer:customers(id, name, business_name, address, gst_number), challan_items(*)',
        { count: 'exact' },
      )
      .eq('user_id', req.userId!);

    if (status && VALID_STATUS.includes(status)) {
      query = query.eq('status', status);
    }
    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }
    if (search?.trim()) {
      query = query.ilike('challan_number', `%${search.trim()}%`);
    }

    const { data, error, count } = await query
      .order(safeSort, { ascending })
      .range(from, to);

    if (error) return serverError(res, error.message);

    return ok(res, paginate(data || [], count ?? 0, page, limit));

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /challans/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', canAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('challans')
      .select(
        '*, customer:customers(id, name, business_name, address, gst_number), challan_items(*)',
      )
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (error) return serverError(res, error.message);
    if (!data)  return notFound(res, 'Challan');

    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /challans
// Body: { customer_id, items: [{ product_id, quantity }] }
// ─────────────────────────────────────────────────────────────
router.post('/', canAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { customer_id, items } = req.body;

    // Top-level validation
    validate([
      required(customer_id, 'customer_id'),
      required(items, 'items'),
    ]);

    if (!Array.isArray(items) || items.length === 0) {
      return badRequest(res, 'items must be a non-empty array');
    }

    // Validate each line item
    const itemErrors: { field: string; message: string }[] = [];
    items.forEach((item: any, idx: number) => {
      if (!item.product_id) {
        itemErrors.push({ field: `items[${idx}].product_id`, message: 'product_id is required' });
      }
      if (!item.quantity || Number(item.quantity) < 1) {
        itemErrors.push({ field: `items[${idx}].quantity`, message: 'quantity must be >= 1' });
      }
    });
    if (itemErrors.length > 0) return validationError(res, itemErrors);

    // Verify customer belongs to this user
    const { data: customer } = await supabaseAdmin
      .from('customers')
      .select('id, name')
      .eq('id', customer_id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!customer) return notFound(res, 'Customer');

    // Fetch product snapshots
    const productIds = [...new Set(items.map((i: any) => i.product_id))] as string[];
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('id, name, sku, unit_price, stock_quantity')
      .in('id', productIds)
      .eq('user_id', req.userId!);

    if (prodError) return serverError(res, prodError.message);

    const productMap: Record<string, any> = {};
    (products || []).forEach((p) => { productMap[p.id] = p; });

    // Verify all products exist
    const missingProducts = productIds.filter((id) => !productMap[id]);
    if (missingProducts.length > 0) {
      return badRequest(res, `Products not found: ${missingProducts.join(', ')}`);
    }

    // Generate sequential challan number
    const { count } = await supabaseAdmin
      .from('challans')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', req.userId!);

    const challanNumber = `SCH-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`;
    const totalQty = items.reduce((s: number, x: any) => s + Number(x.quantity), 0);

    // Insert challan header
    const { data: challan, error: challanError } = await supabaseAdmin
      .from('challans')
      .insert({
        user_id:        req.userId,
        challan_number: challanNumber,
        customer_id,
        status:         'Draft',
        total_quantity: totalQty,
      })
      .select()
      .maybeSingle();

    if (challanError) return serverError(res, challanError.message);

    // Insert line items with product snapshots
    const lineItems = items.map((x: any) => ({
      user_id:      req.userId,
      challan_id:   challan!.id,
      product_id:   x.product_id,
      product_name: productMap[x.product_id].name,
      sku:          productMap[x.product_id].sku,
      unit_price:   productMap[x.product_id].unit_price,
      quantity:     Number(x.quantity),
    }));

    const { error: itemsError } = await supabaseAdmin.from('challan_items').insert(lineItems);
    if (itemsError) return serverError(res, itemsError.message);

    const totalValue = lineItems.reduce(
      (s: number, x: any) => s + x.unit_price * x.quantity, 0,
    );

    return created(res, {
      message:         'Challan created successfully',
      challan_number:  challanNumber,
      challan_id:      challan!.id,
      customer:        { id: customer.id, name: customer.name },
      total_quantity:  totalQty,
      total_value:     totalValue,
      status:          'Draft',
      items:           lineItems,
    });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /challans/:id/confirm
// ─────────────────────────────────────────────────────────────
router.post('/:id/confirm', canAccess, async (req: AuthRequest, res: Response) => {
  try {
    // Confirm challan exists and is a Draft
    const { data: challan } = await supabaseAdmin
      .from('challans')
      .select('id, challan_number, status')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!challan) return notFound(res, 'Challan');
    if (challan.status !== 'Draft') {
      return badRequest(
        res,
        `Challan is already '${challan.status}'. Only Draft challans can be confirmed.`,
      );
    }

    // Call the Supabase stored procedure (handles stock check + deduction atomically)
    const { error } = await supabaseAdmin.rpc('confirm_challan', {
      p_challan_id: req.params.id,
    });

    if (error) {
      const msg = error.message.includes('Insufficient stock')
        ? 'Cannot confirm: one or more products have insufficient stock'
        : error.message.includes('Not authorized')
        ? 'Not authorized to confirm this challan'
        : error.message;
      return badRequest(res, msg);
    }

    return ok(res, {
      message:        'Challan confirmed and stock updated',
      challan_id:     req.params.id,
      challan_number: challan.challan_number,
      status:         'Confirmed',
    });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /challans/:id/cancel
// ─────────────────────────────────────────────────────────────
router.post('/:id/cancel', canAccess, async (req: AuthRequest, res: Response) => {
  try {
    const { data: challan } = await supabaseAdmin
      .from('challans')
      .select('id, challan_number, status')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!challan) return notFound(res, 'Challan');
    if (challan.status !== 'Draft') {
      return badRequest(
        res,
        `Challan is '${challan.status}'. Only Draft challans can be cancelled.`,
      );
    }

    const { error } = await supabaseAdmin
      .from('challans')
      .update({ status: 'Cancelled' })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) return serverError(res, error.message);

    return ok(res, {
      message:        'Challan cancelled',
      challan_id:     req.params.id,
      challan_number: challan.challan_number,
      status:         'Cancelled',
    });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /challans/:id   (admin only)
// ─────────────────────────────────────────────────────────────
router.delete('/:id', requireRole('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const { data: challan } = await supabaseAdmin
      .from('challans')
      .select('id, challan_number, status')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!challan) return notFound(res, 'Challan');
    if (challan.status === 'Confirmed') {
      return badRequest(res, 'Confirmed challans cannot be deleted. Cancel first.');
    }

    const { error } = await supabaseAdmin
      .from('challans')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) return serverError(res, error.message);

    return ok(res, {
      message:        `Challan '${challan.challan_number}' deleted`,
      challan_number: challan.challan_number,
    });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

export default router;
