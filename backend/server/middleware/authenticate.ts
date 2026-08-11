import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabaseAdmin';
import { unauthorized, forbidden } from '../utils/response';

export interface AuthRequest extends Request {
  userId?:    string;
  userRole?:  string;
  userEmail?: string;
}

/**
 * authenticate
 * Validates the Supabase Bearer JWT, loads the user profile,
 * and attaches userId / userRole / userEmail to the request.
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    unauthorized(res, 'Missing Bearer token in Authorization header');
    return;
  }

  const token = header.split(' ')[1];
  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    unauthorized(res, 'Invalid or expired token. Please sign in again.');
    return;
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .maybeSingle();

  req.userId    = data.user.id;
  req.userEmail = data.user.email;
  req.userRole  = profile?.role ?? 'sales';

  next();
}

/**
 * requireRole(...roles)
 * Role-guard factory. Must be used AFTER authenticate.
 *
 * Usage:
 *   router.get('/', authenticate, requireRole('admin', 'sales'), handler)
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      forbidden(
        res,
        `Your role '${req.userRole}' does not have access to this resource. ` +
        `Required: ${roles.join(' | ')}`,
      );
      return;
    }
    next();
  };
}
