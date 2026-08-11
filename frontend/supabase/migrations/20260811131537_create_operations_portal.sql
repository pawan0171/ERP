

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin','sales','warehouse','accounts')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, mobile text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '', business_name text NOT NULL DEFAULT '',
  gst_number text NOT NULL DEFAULT '', customer_type text NOT NULL DEFAULT 'Wholesale' CHECK (customer_type IN ('Retail','Wholesale','Distributor')),
  address text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'Lead' CHECK (status IN ('Lead','Active','Inactive')),
  follow_up_date date, notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL, sku text NOT NULL, category text NOT NULL DEFAULT 'General', unit_price numeric(12,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), min_stock_quantity integer NOT NULL DEFAULT 5 CHECK (min_stock_quantity >= 0),
  location text NOT NULL DEFAULT 'Main warehouse', created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, sku)
);

CREATE TABLE IF NOT EXISTS public.challans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  challan_number text NOT NULL, customer_id uuid NOT NULL REFERENCES public.customers(id), status text NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft','Confirmed','Cancelled')),
  total_quantity integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, challan_number)
);

CREATE TABLE IF NOT EXISTS public.challan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  challan_id uuid NOT NULL REFERENCES public.challans(id) ON DELETE CASCADE, product_id uuid NOT NULL REFERENCES public.products(id),
  product_name text NOT NULL, sku text NOT NULL, unit_price numeric(12,2) NOT NULL DEFAULT 0, quantity integer NOT NULL CHECK (quantity > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE, quantity integer NOT NULL CHECK (quantity > 0),
  movement_type text NOT NULL CHECK (movement_type IN ('IN','OUT')), reason text NOT NULL DEFAULT '', created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_delete_own" ON public.profiles;
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

DO $$ DECLARE t text; BEGIN FOR t IN SELECT unnest(ARRAY['customers','products','challans','challan_items','stock_movements']) LOOP
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_select_own', t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id)', t || '_select_own', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_insert_own', t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id)', t || '_insert_own', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_update_own', t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)', t || '_update_own', t);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_delete_own', t);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id)', t || '_delete_own', t);
END LOOP; END $$;

CREATE INDEX IF NOT EXISTS customers_user_status_idx ON public.customers(user_id, status);
CREATE INDEX IF NOT EXISTS products_user_stock_idx ON public.products(user_id, stock_quantity);
CREATE INDEX IF NOT EXISTS challans_user_created_idx ON public.challans(user_id, created_at DESC);
