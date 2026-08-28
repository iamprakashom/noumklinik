REVOKE EXECUTE ON FUNCTION public.current_clinic_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_member(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_clinic_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
