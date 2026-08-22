
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
REVOKE INSERT, UPDATE, DELETE ON public.user_roles FROM authenticated;
