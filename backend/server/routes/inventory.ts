/**
 * Inventory Routes
 *
 * GET    /inventory                   List products (paginated + search)
 * GET    /inventory/:id               Get single product
 * POST   /inventory                   Create product
 * PUT    /inventory/:id               Update product
 * DELETE /inventory/:id               Delete product
 * POST   /inventory/:id/adjust        Adjust stock IN / OUT
 * GET    /inventory/:id/movements     Stock movement history (paginated)
 *
 * Read  : admin, sales, warehouse, accounts
 * Write : admin, warehouse
 */

import { Router, Response } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { authenticate, requireRole, AuthRequest } from '../middleware/authenticate';
import {
  validate,
  required,
  minLength,
  isOneOf,
  isPositiveNumber,
  isPositiveInteger,
  ValidationException,
} from '../utils/validation';
import { parsePagination, paginate } from '../utils/pagination';
import { ok, created, notFound, serverError, validationError, badRequest } from '../utils/response';

const router = Router();
router.use(authenticate);

const canRead  = requireRole('admin', 'sales', 'warehouse', 'accounts');
const canWrite = requireRole('admin', 'warehouse');

// ─────────────────────────────────────────────────────────────
// GET /inventory
// Query: page, limit, search, category, low_stock (true/false)
// ─────────────────────────────────────────────────────────────
router.get('/', canRead, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, from, to } = parsePagination(req);
    const {
      search,
      category,
      low_stock,
      sort_by  = 'name',
      sort_dir = 'asc',
    } = req.query as Record<string, string>;

    const SORTABLE = ['name', 'sku', 'category', 'stock_quantity', 'unit_price', 'created_at'];
    const safeSort = SORTABLE.includes(sort_by) ? sort_by : 'name';
    const ascending = sort_dir !== 'desc';

    let query = supabaseAdmin
      .from('products')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId!);

    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`name.ilike.${s},sku.ilike.${s},category.ilike.${s}`);
    }
    if (category?.trim()) {
      query = query.ilike('category', category.trim());
    }
    // low_stock=true → stock below min threshold
    if (low_stock === 'true') {
      query = (query as any).filter('stock_quantity', 'lt', supabaseAdmin.from('products').select('min_stock_quantity'));
      // Supabase doesn't support cross-column filter directly — use raw filter
      query = (query as any).filter('stock_quantity', 'lt', 'min_stock_quantity');
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
// GET /inventory/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', canRead, async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (error) return serverError(res, error.message);
    if (!data)  return notFound(res, 'Product');

    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /inventory
// ─────────────────────────────────────────────────────────────
router.post('/', canWrite, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, sku,
      category         = 'General',
      unit_price       = 0,
      stock_quantity   = 0,
      min_stock_quantity = 5,
      location         = 'Main warehouse',
    } = req.body;

    validate([
      required(name, 'name'),
      required(sku,  'sku'),
      minLength(name, 'name', 2),
      minLength(sku,  'sku',  1),
      isPositiveNumber(unit_price,         'unit_price'),
      isPositiveNumber(stock_quantity,     'stock_quantity'),
      isPositiveNumber(min_stock_quantity, 'min_stock_quantity'),
    ]);

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        user_id: req.userId,
        name: name.trim(),
        sku:  sku.trim().toUpperCase(),
        category: category.trim(),
        unit_price:        Number(unit_price),
        stock_quantity:    Number(stock_quantity),
        min_stock_quantity: Number(min_stock_quantity),
        location: location.trim(),
      })
      .select()
      .maybeSingle();

    if (error) {
      if (error.message.includes('unique')) {
        return res.status(409).json({ error: `SKU '${sku}' already exists` });
      }
      return serverError(res, error.message);
    }

    return created(res, { message: 'Product created', product: data });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /inventory/:id
// ─────────────────────────────────────────────────────────────
router.put('/:id', canWrite, async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, sku, category, unit_price,
      stock_quantity, min_stock_quantity, location,
    } = req.body;

    validate([
      name              ? minLength(name, 'name', 2)                                   : null,
      unit_price        !== undefined ? isPositiveNumber(unit_price, 'unit_price')      : null,
      stock_quantity    !== undefined ? isPositiveNumber(stock_quantity, 'stock_quantity') : null,
      min_stock_quantity !== undefined ? isPositiveNumber(min_stock_quantity, 'min_stock_quantity') : null,
    ]);

    const update: Record<string, any> = {};
    if (name               !== undefined) update.name               = name.trim();
    if (sku                !== undefined) update.sku                = sku.trim().toUpperCase();
    if (category           !== undefined) update.category           = category.trim();
    if (unit_price         !== undefined) update.unit_price         = Number(unit_price);
    if (stock_quantity     !== undefined) update.stock_quantity     = Number(stock_quantity);
    if (min_stock_quantity !== undefined) update.min_stock_quantity = Number(min_stock_quantity);
    if (location           !== undefined) update.location           = location.trim();

    if (Object.keys(update).length === 0) {
      return badRequest(res, 'No fields provided to update');
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(update)
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .maybeSingle();

    if (error) return serverError(res, error.message);
    if (!data)  return notFound(res, 'Product');

    return ok(res, { message: 'Product updated', product: data });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /inventory/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', canWrite, async (req: AuthRequest, res: Response) => {
  try {
    const { data: existing } = await supabaseAdmin
      .from('products')
      .select('id, name')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!existing) return notFound(res, 'Product');

    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) return serverError(res, error.message);

    return ok(res, { message: `Product '${existing.name}' deleted successfully` });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /inventory/:id/adjust
// Body: { quantity, movement_type: 'IN'|'OUT', reason }
// ─────────────────────────────────────────────────────────────
router.post('/:id/adjust', canWrite, async (req: AuthRequest, res: Response) => {
  try {
    const { quantity, movement_type, reason = '' } = req.body;

    validate([
      required(quantity,      'quantity'),
      required(movement_type, 'movement_type'),
      isPositiveInteger(quantity, 'quantity'),
      isOneOf(movement_type, 'movement_type', ['IN', 'OUT']),
    ]);

    // Fetch current product
    const { data: product, error: fetchError } = await supabaseAdmin
      .from('products')
      .select('id, name, stock_quantity')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (fetchError) return serverError(res, fetchError.message);
    if (!product)   return notFound(res, 'Product');

    // Guard: cannot remove more stock than available
    if (movement_type === 'OUT' && product.stock_quantity < Number(quantity)) {
      return badRequest(
        res,
        `Cannot remove ${quantity} units. Only ${product.stock_quantity} in stock.`,
      );
    }

    const delta    = movement_type === 'IN' ? Number(quantity) : -Number(quantity);
    const newStock = product.stock_quantity + delta;

    // Update stock
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update({ stock_quantity: newStock })
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (updateError) return serverError(res, updateError.message);

    // Log movement
    await supabaseAdmin.from('stock_movements').insert({
      user_id:       req.userId,
      product_id:    req.params.id,
      quantity:      Number(quantity),
      movement_type,
      reason:        reason || (movement_type === 'IN' ? 'Stock received' : 'Stock issued'),
      created_by:    req.userId,
    });

    return ok(res, {
      message:       `Stock ${movement_type === 'IN' ? 'added' : 'removed'} successfully`,
      product_id:    req.params.id,
      product_name:  product.name,
      movement_type,
      quantity:      Number(quantity),
      previous_stock: product.stock_quantity,
      new_stock:     newStock,
    });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /inventory/:id/movements
// Query: page, limit, movement_type
// ─────────────────────────────────────────────────────────────
router.get('/:id/movements', canWrite, async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, from, to } = parsePagination(req);
    const { movement_type } = req.query as Record<string, string>;

    // Confirm product exists
    const { data: product } = await supabaseAdmin
      .from('products')
      .select('id')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!product) return notFound(res, 'Product');

    let query = supabaseAdmin
      .from('stock_movements')
      .select('*', { count: 'exact' })
      .eq('product_id', req.params.id)
      .eq('user_id', req.userId!);

    if (movement_type && ['IN', 'OUT'].includes(movement_type)) {
      query = query.eq('movement_type', movement_type);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return serverError(res, error.message);

    return ok(res, paginate(data || [], count ?? 0, page, limit));

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

export default router;
