
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION public.confirm_challan(p_challan_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item record;
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.challans
  WHERE id = p_challan_id;

  IF v_owner IS NULL OR v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.challans WHERE id = p_challan_id AND status = 'Draft' AND user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only draft challans can be confirmed';
  END IF;

  FOR v_item IN SELECT product_id, quantity FROM public.challan_items WHERE challan_id = p_challan_id AND user_id = auth.uid() LOOP
    IF v_item.quantity IS NULL OR v_item.quantity < 1 THEN
      RAISE EXCEPTION 'Invalid quantity';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.products
      WHERE id = v_item.product_id AND user_id = auth.uid() AND stock_quantity >= v_item.quantity
    ) THEN
      RAISE EXCEPTION 'Insufficient stock';
    END IF;
  END LOOP;

  FOR v_item IN SELECT product_id, quantity FROM public.challan_items WHERE challan_id = p_challan_id AND user_id = auth.uid() LOOP
    UPDATE public.products
    SET stock_quantity = stock_quantity - v_item.quantity
    WHERE id = v_item.product_id AND user_id = auth.uid();
    INSERT INTO public.stock_movements (user_id, product_id, quantity, movement_type, reason)
    VALUES (auth.uid(), v_item.product_id, v_item.quantity, 'OUT', 'Confirmed sales challan');
  END LOOP;

  UPDATE public.challans SET status = 'Confirmed' WHERE id = p_challan_id AND user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_challan(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.confirm_challan(uuid) TO authenticated;

DROP POLICY IF EXISTS "customers_select_own" ON public.customers;
CREATE POLICY "customers_select_own" ON public.customers FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sales','accounts')));
DROP POLICY IF EXISTS "customers_insert_own" ON public.customers;
CREATE POLICY "customers_insert_own" ON public.customers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sales','accounts')));
DROP POLICY IF EXISTS "customers_update_own" ON public.customers;
CREATE POLICY "customers_update_own" ON public.customers FOR UPDATE TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sales','accounts'))) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sales','accounts')));
DROP POLICY IF EXISTS "customers_delete_own" ON public.customers;
CREATE POLICY "customers_delete_own" ON public.customers FOR DELETE TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','sales','accounts')));

DROP POLICY IF EXISTS "products_select_own" ON public.products;
CREATE POLICY "products_select_own" ON public.products FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse','sales','accounts')));
DROP POLICY IF EXISTS "products_insert_own" ON public.products;
CREATE POLICY "products_insert_own" ON public.products FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse')));
DROP POLICY IF EXISTS "products_update_own" ON public.products;
CREATE POLICY "products_update_own" ON public.products FOR UPDATE TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse'))) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse')));
DROP POLICY IF EXISTS "products_delete_own" ON public.products;
CREATE POLICY "products_delete_own" ON public.products FOR DELETE TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse')));

DROP POLICY IF EXISTS "stock_movements_select_own" ON public.stock_movements;
CREATE POLICY "stock_movements_select_own" ON public.stock_movements FOR SELECT TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse')));
DROP POLICY IF EXISTS "stock_movements_insert_own" ON public.stock_movements;
CREATE POLICY "stock_movements_insert_own" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse')));
DROP POLICY IF EXISTS "stock_movements_update_own" ON public.stock_movements;
CREATE POLICY "stock_movements_update_own" ON public.stock_movements FOR UPDATE TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse'))) WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','warehouse')));
DROP POLICY IF EXISTS "stock_movements_delete_own" ON public.stock_movements;
CREATE POLICY "stock_movements_delete_own" ON public.stock_movements FOR DELETE TO authenticated USING (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
