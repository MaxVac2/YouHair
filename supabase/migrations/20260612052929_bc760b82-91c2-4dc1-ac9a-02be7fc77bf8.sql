REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

CREATE POLICY "Users update own orders"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own orders"
ON public.orders FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update items in own orders"
ON public.order_items FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));

CREATE POLICY "Users delete items in own orders"
ON public.order_items FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));