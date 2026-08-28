INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'front_desk'::app_role
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id)
ON CONFLICT (user_id, role) DO NOTHING;