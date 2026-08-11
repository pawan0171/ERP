-- ============================================================
-- Row Level Security (RLS) Policies for Operations Portal
-- ============================================================
-- Run these in Supabase SQL Editor to allow authenticated users
-- to perform CRUD operations on tables
-- ============================================================

-- ==================== CUSTOMERS TABLE ====================

-- Allow authenticated users to read all customers
CREATE POLICY "Authenticated users can read customers"
ON customers FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert customers
CREATE POLICY "Authenticated users can insert customers"
ON customers FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update customers
CREATE POLICY "Authenticated users can update customers"
ON customers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete customers
CREATE POLICY "Authenticated users can delete customers"
ON customers FOR DELETE
TO authenticated
USING (true);


-- ==================== PRODUCTS TABLE ====================

-- Allow authenticated users to read all products
CREATE POLICY "Authenticated users can read products"
ON products FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert products
CREATE POLICY "Authenticated users can insert products"
ON products FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update products
CREATE POLICY "Authenticated users can update products"
ON products FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete products
CREATE POLICY "Authenticated users can delete products"
ON products FOR DELETE
TO authenticated
USING (true);


-- ==================== CHALLANS TABLE ====================

-- Allow authenticated users to read all challans
CREATE POLICY "Authenticated users can read challans"
ON challans FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert challans
CREATE POLICY "Authenticated users can insert challans"
ON challans FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update challans
CREATE POLICY "Authenticated users can update challans"
ON challans FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete challans
CREATE POLICY "Authenticated users can delete challans"
ON challans FOR DELETE
TO authenticated
USING (true);


-- ==================== CHALLAN_ITEMS TABLE ====================

-- Allow authenticated users to read all challan items
CREATE POLICY "Authenticated users can read challan_items"
ON challan_items FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert challan items
CREATE POLICY "Authenticated users can insert challan_items"
ON challan_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update challan items
CREATE POLICY "Authenticated users can update challan_items"
ON challan_items FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete challan items
CREATE POLICY "Authenticated users can delete challan_items"
ON challan_items FOR DELETE
TO authenticated
USING (true);


-- ==================== STOCK_MOVEMENTS TABLE ====================

-- Allow authenticated users to read all stock movements
CREATE POLICY "Authenticated users can read stock_movements"
ON stock_movements FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert stock movements
CREATE POLICY "Authenticated users can insert stock_movements"
ON stock_movements FOR INSERT
TO authenticated
WITH CHECK (true);

-- Note: Usually stock movements are NOT updated or deleted (audit trail)
-- But adding policies just in case they're needed

-- Allow authenticated users to update stock movements
CREATE POLICY "Authenticated users can update stock_movements"
ON stock_movements FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);


-- ==================== PROFILES TABLE ====================
-- Profiles should already have policies from migration, but adding comprehensive ones

-- Drop existing if they conflict, then recreate
DROP POLICY IF EXISTS "Users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Allow authenticated users to read all profiles
CREATE POLICY "Authenticated users can read all profiles"
ON profiles FOR SELECT
TO authenticated
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);


-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================
-- Run these to verify policies are created:

-- Check customers policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'customers';

-- Check products policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'products';

-- Check challans policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd 
FROM pg_policies 
WHERE tablename = 'challans';

-- Check all tables for RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('customers', 'products', 'challans', 'challan_items', 'stock_movements', 'profiles');


-- ============================================================
-- ALTERNATIVE: DISABLE RLS (NOT RECOMMENDED FOR PRODUCTION)
-- ============================================================
-- Only use this for testing/development if policies don't work
-- WARNING: This removes all security!

-- ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE challans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE challan_items DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_movements DISABLE ROW LEVEL SECURITY;
