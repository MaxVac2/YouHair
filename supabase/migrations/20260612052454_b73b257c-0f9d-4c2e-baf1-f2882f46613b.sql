REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Public can view company profiles by slug" ON public.profiles;

REVOKE SELECT (stock) ON public.products FROM anon, authenticated;

DROP POLICY IF EXISTS "Anyone can view event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own event assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own event assets" ON storage.objects;

CREATE POLICY "Admins can read event assets"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'event-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can upload event assets"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update event assets"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'event-assets' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete event assets"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'event-assets' AND public.has_role(auth.uid(), 'admin'));