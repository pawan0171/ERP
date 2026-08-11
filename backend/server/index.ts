import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes      from './routes/auth';
import customersRoutes from './routes/customers';
import inventoryRoutes from './routes/inventory';
import challansRoutes  from './routes/challans';
import dashboardRoutes from './routes/dashboard';
import testPrismaRoutes from './routes/test-prisma';
import { ValidationException } from './utils/validation';
import { validationError, serverError } from './utils/response';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 4000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://erp-by4z.vercel.app',
        /\.vercel\.app$/,  // Allow all Vercel preview URLs
      ]
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/challans',  challansRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/test-prisma', testPrismaRoutes); // Test Prisma routes

// ── 404 for unknown routes ────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler ──────────────────────────────────────
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', err?.message || err);
  if (err instanceof ValidationException) return validationError(res, err.errors);
  return serverError(res, err?.message || 'Internal server error');
});

// ── Start server (only in development) ───────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀  Northstar API server`);
    console.log(`    http://localhost:${PORT}/api\n`);
    console.log(`    POST   /api/auth/login`);
    console.log(`    POST   /api/auth/register`);
    console.log(`    GET    /api/customers`);
    console.log(`    GET    /api/inventory`);
    console.log(`    GET    /api/challans`);
    console.log(`    GET    /api/dashboard/stats`);
    console.log(`\n    🧪 Prisma Test Routes:`);
    console.log(`    GET    /api/test-prisma/health`);
    console.log(`    GET    /api/test-prisma/customers (auth required)`);
    console.log(`    GET    /api/test-prisma/stats (auth required)\n`);
  });
}

// Export for Vercel serverless
export default app;
