# Northstar Operations — Backend API

Express + TypeScript backend that wraps Supabase with role-based access control.

## Stack
- **Runtime**: Node.js with `tsx` (TypeScript execution)
- **Framework**: Express
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase JWT verification

## Setup

1. Get your Supabase **Service Role key** from:  
   `Supabase Dashboard → Project Settings → API → service_role`

2. Add it to `.env`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_key_here
   ```

3. Start the backend:
   ```bash
   npm run server:dev     # development (auto-reload)
   npm run server         # production
   ```

Server runs at: **http://localhost:4000**

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register with role |
| POST | `/api/auth/signin` | Login, returns JWT |
| POST | `/api/auth/signout` | Invalidate session |
| GET  | `/api/auth/me` | Get current user + profile |

### Customers *(admin, sales, accounts)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/customers` | List (search, status filter) |
| GET    | `/api/customers/:id` | Get one |
| POST   | `/api/customers` | Create |
| PUT    | `/api/customers/:id` | Update |
| DELETE | `/api/customers/:id` | Delete |

### Inventory *(read: all roles / write: admin, warehouse)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/inventory` | List products |
| GET    | `/api/inventory/:id` | Get one |
| POST   | `/api/inventory` | Create product |
| PUT    | `/api/inventory/:id` | Update product |
| DELETE | `/api/inventory/:id` | Delete product |
| POST   | `/api/inventory/:id/adjust` | Adjust stock (IN/OUT) |
| GET    | `/api/inventory/:id/movements` | Stock movement history |

### Challans *(admin, sales, accounts)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/challans` | List challans |
| GET    | `/api/challans/:id` | Get one |
| POST   | `/api/challans` | Create draft challan |
| POST   | `/api/challans/:id/confirm` | Confirm + deduct stock |
| POST   | `/api/challans/:id/cancel` | Cancel draft |
| DELETE | `/api/challans/:id` | Hard delete *(admin only)* |

### Dashboard *(all roles)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Aggregated counts + values |
| GET | `/api/dashboard/recent-challans` | Last 5 challans |
| GET | `/api/dashboard/low-stock` | Products below threshold |

---

## Role Access Matrix

| Route | admin | sales | warehouse | accounts |
|-------|:-----:|:-----:|:---------:|:--------:|
| Customers | ✅ | ✅ | ❌ | ✅ |
| Inventory (read) | ✅ | ✅ | ✅ | ✅ |
| Inventory (write) | ✅ | ❌ | ✅ | ❌ |
| Challans | ✅ | ✅ | ❌ | ✅ |
| Dashboard | ✅ | ✅ | ✅ | ✅ |

## Authentication

All protected routes require:
```
Authorization: Bearer <supabase_access_token>
```
Get the token from `/api/auth/signin` response.
