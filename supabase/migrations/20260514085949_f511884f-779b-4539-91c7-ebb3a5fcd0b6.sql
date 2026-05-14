
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  admin_exists BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') INTO admin_exists;
  IF admin_exists THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END; $$;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_exists()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin');
$$;
GRANT EXECUTE ON FUNCTION public.admin_exists() TO anon, authenticated;
