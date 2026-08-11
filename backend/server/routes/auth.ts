/**
 * Auth Routes
 *
 * POST   /auth/login        Sign in with email + password
 * POST   /auth/register     Create new account with role
 * POST   /auth/logout       Invalidate session
 * GET    /auth/me           Get current user profile
 */

import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import {
  validate,
  required,
  minLength,
  isEmail,
  isOneOf,
} from '../utils/validation';
import { ValidationException } from '../utils/validation';
import { ok, created, unauthorized, serverError, validationError, badRequest } from '../utils/response';

const router = Router();

const VALID_ROLES = ['admin', 'sales', 'warehouse', 'accounts'];

// ─────────────────────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // Input validation
    validate([
      required(email,    'email'),
      required(password, 'password'),
      isEmail(email,     'email'),
      minLength(password, 'password', 6),
    ]);

    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email:    email.trim().toLowerCase(),
      password,
    });

    if (error || !data?.session) {
      return unauthorized(res, 'Invalid email or password');
    }

    // Fetch profile for role info
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role')
      .eq('id', data.user.id)
      .maybeSingle();

    return ok(res, {
      message:       'Login successful',
      access_token:  data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in:    data.session.expires_in,
      user: {
        id:    data.user.id,
        email: data.user.email,
      },
      profile,
    });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /auth/register
// ─────────────────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, full_name, role = 'sales' } = req.body;

    // Input validation
    validate([
      required(email,     'email'),
      required(password,  'password'),
      required(full_name, 'full_name'),
      isEmail(email,      'email'),
      minLength(password, 'password', 6),
      minLength(full_name,'full_name', 2),
      isOneOf(role,       'role', VALID_ROLES),
    ]);

    // Create auth user (email auto-confirmed for dev convenience)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim().toLowerCase(),
      password,
      email_confirm: true,
    });

    if (error) {
      // Supabase returns 422 for duplicate email
      const isDuplicate = error.message.toLowerCase().includes('already');
      return res.status(isDuplicate ? 409 : 400).json({
        error: isDuplicate
          ? 'An account with this email already exists'
          : error.message,
      });
    }

    // Save profile with chosen role
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({ id: data.user.id, full_name: full_name.trim(), role });

    if (profileError) return serverError(res, profileError.message);

    return created(res, {
      message: 'Account created successfully',
      user: {
        id:        data.user.id,
        email:     data.user.email,
        full_name: full_name.trim(),
        role,
      },
    });

  } catch (err: any) {
    if (err instanceof ValidationException) return validationError(res, err.errors);
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const token = req.headers.authorization!.split(' ')[1];
    await supabaseAdmin.auth.admin.signOut(token);
    return ok(res, { message: 'Logged out successfully' });
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /auth/me
// ─────────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, created_at')
      .eq('id', req.userId)
      .maybeSingle();

    return ok(res, {
      user: { id: req.userId, email: req.userEmail },
      profile,
    });
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

export default router;
