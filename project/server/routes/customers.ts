/**
 * Customer Routes
 *
 * GET    /customers              List with pagination + search + filter
 * GET    /customers/:id          Get single customer
 * POST   /customers              Create customer
 * PUT    /customers/:id          Update customer
 * DELETE /customers/:id          Delete customer
 *
 * Allowed roles: admin, sales, accounts
 */

import { Router, Response } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { authenticate, requireRole, AuthRequest } from '../middleware/authenticate';
import {
  validate,
  required,
  minLength,
  isOneOf,
  isEmail,
  isDate,
  ValidationException,
} from '../utils/validation';
import { parsePagination, paginate } from '../utils/pagination';
import { ok, created, notFound, serverError, validationError } from '../utils/response';

const router = Router();

// All routes: must be logged in + correct role
router.use(authenticate, requireRole('admin', 'sales', 'accounts'));

const CUSTOMER_TYPES = ['Retail', 'Wholesale', 'Distributor'];
const STATUSES       = ['Lead', 'Active', 'Inactive'];

// ─────────────────────────────────────────────────────────────
// GET /customers
// Query: page, limit, search, status, customer_type, sort_by, sort_dir
// ─────────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, from, to } = parsePagination(req);

    const {
      search,
      status,
      customer_type,
      sort_by  = 'created_at',
      sort_dir = 'desc',
    } = req.query as Record<string, string>;

    const SORTABLE = ['name', 'created_at', 'status', 'business_name'];
    const safeSort = SORTABLE.includes(sort_by) ? sort_by : 'created_at';
    const ascending = sort_dir === 'asc';

    let query = supabaseAdmin
      .from('customers')
      .select('*', { count: 'exact' })
      .eq('user_id', req.userId!);

    // ── Filters
    if (status && STATUSES.includes(status)) {
      query = query.eq('status', status);
    }
    if (customer_type && CUSTOMER_TYPES.includes(customer_type)) {
      query = query.eq('customer_type', customer_type);
    }

    // ── Search: name OR mobile OR business_name
    if (search?.trim()) {
      const s = `%${search.trim()}%`;
      query = query.or(`name.ilike.${s},mobile.ilike.${s},business_name.ilike.${s},email.ilike.${s}`);
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
// GET /customers/:id
// ─────────────────────────────────────────────────────────────
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (error) return serverError(res, error.message);
    if (!data)  return notFound(res, 'Customer');

    return ok(res, data);
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /customers
// ─────────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, mobile = '', email = '', business_name = '',
      gst_number = '', customer_type = 'Wholesale',
      address = '', status = 'Lead',
      follow_up_date = null, notes = '',
    } = req.body;

    // Validation
    validate([
      required(name,  'name'),
      minLength(name, 'name', 2),
      isOneOf(customer_type, 'customer_type', CUSTOMER_TYPES),
      isOneOf(status, 'status', STATUSES),
      email ? isEmail(email, 'email') : null,
      isDate(follow_up_date, 'follow_up_date'),
    ]);

    const { data, error } = await supabaseAdmin
      .from('customers')
      .insert({
        user_id: req.userId,
        name: name.trim(), mobile, email, business_name,
        gst_number, customer_type, address, status,
        follow_up_date: follow_up_date || null,
        notes,
      })
      .select()
      .maybeSingle();

    if (error) return serverError(res, error.message);
    return created(res, { message: 'Customer created', customer: data });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /customers/:id
// ─────────────────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const {
      name, mobile, email, business_name,
      gst_number, customer_type, address, status,
      follow_up_date, notes,
    } = req.body;

    // Partial validation — only validate fields that are provided
    validate([
      name          ? required(name, 'name')                           : null,
      name          ? minLength(name, 'name', 2)                       : null,
      customer_type ? isOneOf(customer_type, 'customer_type', CUSTOMER_TYPES) : null,
      status        ? isOneOf(status, 'status', STATUSES)             : null,
      email         ? isEmail(email, 'email')                          : null,
      follow_up_date ? isDate(follow_up_date, 'follow_up_date')        : null,
    ]);

    // Build only provided fields into update payload
    const update: Record<string, any> = {};
    if (name           !== undefined) update.name           = name.trim();
    if (mobile         !== undefined) update.mobile         = mobile;
    if (email          !== undefined) update.email          = email;
    if (business_name  !== undefined) update.business_name  = business_name;
    if (gst_number     !== undefined) update.gst_number     = gst_number;
    if (customer_type  !== undefined) update.customer_type  = customer_type;
    if (address        !== undefined) update.address        = address;
    if (status         !== undefined) update.status         = status;
    if (follow_up_date !== undefined) update.follow_up_date = follow_up_date || null;
    if (notes          !== undefined) update.notes          = notes;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const { data, error } = await supabaseAdmin
      .from('customers')
      .update(update)
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .select()
      .maybeSingle();

    if (error) return serverError(res, error.message);
    if (!data)  return notFound(res, 'Customer');

    return ok(res, { message: 'Customer updated', customer: data });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /customers/:id
// ─────────────────────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    // Verify exists first
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id, name')
      .eq('id', req.params.id)
      .eq('user_id', req.userId!)
      .maybeSingle();

    if (!existing) return notFound(res, 'Customer');

    const { error } = await supabaseAdmin
      .from('customers')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', req.userId!);

    if (error) return serverError(res, error.message);

    return ok(res, { message: `Customer '${existing.name}' deleted successfully` });

  } catch (err: any) {
    return serverError(res, err.message);
  }
});

export default router;
