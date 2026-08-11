# Northstar Operations Portal — API & Architecture Documentation

## Overview

Northstar Operations is a full-stack wholesale distribution management portal. It provides CRM, inventory management, and sales challan (delivery note) workflows for wholesale distributors. The application is built with React + TypeScript on the frontend and Supabase (PostgreSQL) as the backend.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite, lucide-react (icons)
- **Backend:** Supabase (PostgreSQL database, Auth, Row Level Security)
- **Styling:** Custom CSS with a dark admin-dashboard theme

## Architecture

```
Browser (React SPA)
    │
    ├── Supabase Auth (email/password)
    │
    └── Supabase Data API (PostgreSQL via REST)
         ├── profiles
         ├── customers
         ├── products
         ├── challans
         ├── challan_items
         └── stock_movements
```

The browser communicates directly with Supabase using the anon key. Row Level Security (RLS) policies enforce that each authenticated user can only access their own data. A `SECURITY DEFINER` function (`confirm_challan`) handles the atomic stock-reduction logic for challan confirmation.

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| Sign up | `supabase.auth.signUp()` | Create account with email + password. A profile row is auto-created. |
| Sign in | `supabase.auth.signInWithPassword()` | Returns session JWT. |
| Sign out | `supabase.auth.signOut()` | Clears session. |

Email confirmation is OFF. Passwords must be at least 6 characters.

## Data Model

### profiles
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | References `auth.users.id` |
| full_name | text | Display name |
| role | text | `admin`, `sales`, `warehouse`, or `accounts` |

### customers
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | Owner, defaults to `auth.uid()` |
| name | text | Contact name |
| mobile | text | Phone number |
| email | text | Email address |
| business_name | text | Company or shop name |
| gst_number | text | GSTIN |
| customer_type | text | `Retail`, `Wholesale`, or `Distributor` |
| address | text | Delivery address |
| status | text | `Lead`, `Active`, or `Inactive` |
| follow_up_date | date | Next follow-up date |
| notes | text | Internal notes |

### products
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | Owner |
| name | text | Product name |
| sku | text | Stock keeping unit (unique per user) |
| category | text | Product category |
| unit_price | numeric(12,2) | Selling price |
| stock_quantity | integer | Current stock on hand |
| min_stock_quantity | integer | Reorder threshold |
| location | text | Warehouse location |

### challans
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| user_id | uuid (FK) | Owner |
| challan_number | text | Human-readable ID (e.g. `SCH-2026-0001`) |
| customer_id | uuid (FK) | References `customers.id` |
| status | text | `Draft`, `Confirmed`, or `Cancelled` |
| total_quantity | integer | Sum of item quantities |

### challan_items
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| challan_id | uuid (FK) | References `challans.id` |
| product_id | uuid (FK) | References `products.id` |
| product_name | text | Snapshot of product name at creation time |
| sku | text | Snapshot of SKU |
| unit_price | numeric(12,2) | Snapshot of price |
| quantity | integer | Units dispatched |

### stock_movements
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| product_id | uuid (FK) | References `products.id` |
| quantity | integer | Units moved |
| movement_type | text | `IN` or `OUT` |
| reason | text | Reason for adjustment |
| created_at | timestamptz | Timestamp |

## Role-Based Access Control

| Role | Customers | Inventory | Stock Movements | Challans |
|------|-----------|----------|-----------------|----------|
| admin | Full CRUD | Full CRUD | Full CRUD | Full CRUD |
| sales | Full CRUD | Read only | No access | Full CRUD |
| warehouse | No access | Full CRUD | Full CRUD | No access |
| accounts | Full CRUD | Read only | No access | Full CRUD |

Access is enforced at the database level through RLS policies that check both ownership (`user_id = auth.uid()`) and role (via a subquery on `profiles`).

## Business Logic

### Challan Lifecycle

1. **Draft** — A challan is created with selected customer and products. No stock is reduced at this stage.
2. **Confirmed** — Calling the `confirm_challan` database function atomically:
   - Verifies the caller owns the challan
   - Verifies the challan is in Draft status
   - Validates every item quantity is positive
   - Checks sufficient stock exists for every item
   - Reduces product stock
   - Logs stock movements
   - Updates challan status to Confirmed
3. **Cancelled** — A Draft challan can be cancelled. No stock restoration is needed because no stock was reduced.

### Stock Adjustments

Warehouse/admin users can manually adjust stock via the Inventory screen. Each adjustment creates a `stock_movements` record for audit trail.

## Security

- **Row Level Security** is enabled on every table
- **Ownership** is enforced via `user_id = auth.uid()` in all policies
- **Role checks** are enforced in RLS policies through subqueries on `profiles.role`
- **Profile role** is not client-writable (UPDATE privilege revoked on the `role` column)
- **Challan confirmation** runs as a `SECURITY DEFINER` function that validates ownership, status, quantity, and stock availability before making any changes
- **Error messages** shown to users are generic; detailed errors are logged to console only

## Setup & Running

```bash
npm install
npm run dev      # Start dev server
npm run build    # Production build
npm run typecheck # Type checking
```

Environment variables (pre-populated):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_ANON_KEY` — Supabase anon public key

## Assumptions & Notes

- Single-organization per user (each user manages their own customers, products, and challans)
- Challan numbering is sequential per user
- Product price and name are snapshotted on challan items so historical documents remain accurate
- The app is responsive and works on mobile, tablet, and desktop
