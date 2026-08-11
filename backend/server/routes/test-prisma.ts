/**
 * Test Prisma Routes
 * 
 * GET /test-prisma/customers     Test customer query
 * GET /test-prisma/stats         Test aggregations
 * GET /test-prisma/health        Test database connection
 */

import { Router, Response } from 'express';
import { prisma } from '../prismaClient';
import { authenticate, AuthRequest } from '../middleware/authenticate';
import { ok, serverError } from '../utils/response';

const router = Router();

// ─────────────────────────────────────────────────────────────
// GET /test-prisma/health
// Test basic database connection
// ─────────────────────────────────────────────────────────────
router.get('/health', async (_req, res: Response) => {
  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`;
    return ok(res, {
      status: 'connected',
      message: 'Prisma database connection is healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return serverError(res, `Database connection failed: ${err.message}`);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /test-prisma/customers
// Test customer query with Prisma
// ─────────────────────────────────────────────────────────────
router.get('/customers', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      where: { user_id: req.userId! },
      take: 10,
      include: {
        profile: {
          select: {
            full_name: true,
            role: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return ok(res, {
      message: 'Prisma query successful',
      count: customers.length,
      customers,
    });
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /test-prisma/stats
// Test aggregation queries
// ─────────────────────────────────────────────────────────────
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [customerCount, productCount, challanCount] = await Promise.all([
      prisma.customer.count({ where: { user_id: req.userId! } }),
      prisma.product.count({ where: { user_id: req.userId! } }),
      prisma.challan.count({ where: { user_id: req.userId! } }),
    ]);

    return ok(res, {
      message: 'Prisma aggregations successful',
      stats: {
        customers: customerCount,
        products: productCount,
        challans: challanCount,
      },
    });
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /test-prisma/products
// Test product query with low stock filter
// ─────────────────────────────────────────────────────────────
router.get('/products', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        user_id: req.userId!,
        stock_quantity: {
          lt: prisma.product.fields.min_stock_quantity,
        },
      },
      take: 10,
      select: {
        id: true,
        name: true,
        sku: true,
        stock_quantity: true,
        min_stock_quantity: true,
        location: true,
      },
    });

    return ok(res, {
      message: 'Low stock products',
      count: products.length,
      products,
    });
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /test-prisma/create-sample
// Create sample customer (for testing)
// ─────────────────────────────────────────────────────────────
router.post('/create-sample', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const customer = await prisma.customer.create({
      data: {
        user_id: req.userId!,
        name: 'Test Customer',
        mobile: '9876543210',
        email: 'test@example.com',
        business_name: 'Test Business',
        customer_type: 'Wholesale',
        status: 'Active',
      },
    });

    return ok(res, {
      message: 'Sample customer created',
      customer,
    });
  } catch (err: any) {
    return serverError(res, err.message);
  }
});

export default router;
