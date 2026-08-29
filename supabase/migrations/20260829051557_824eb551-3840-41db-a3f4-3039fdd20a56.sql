create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

create or replace function private.current_clinic_id()
returns uuid language sql stable security definer set search_path to 'public' as $$
  select clinic_id from public.clinic_members
  where user_id = auth.uid() and status = 'active'
  order by created_at limit 1
$$;

create or replace function private.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.clinic_members m
    where m.user_id = _user_id and m.role = _role and m.status = 'active'
      and m.clinic_id = private.current_clinic_id()
  )
$$;

create or replace function private.is_clinic_member(_clinic_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = _clinic_id and user_id = auth.uid() and status = 'active'
  )
$$;

create or replace function private.is_clinic_admin(_clinic_id uuid)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.clinic_members
    where clinic_id = _clinic_id and user_id = auth.uid()
      and status = 'active' and role = 'admin'
  )
$$;

-- object path is "<patient_id>/<file>"; verify that patient belongs to the caller's clinic
create or replace function private.can_access_patient_photo(_object_name text)
returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (
    select 1 from public.patients p
    where p.id::text = split_part(_object_name, '/', 1)
      and private.is_clinic_member(p.clinic_id)
  )
$$;

revoke all on function private.current_clinic_id(), private.has_role(uuid, public.app_role),
  private.is_clinic_member(uuid), private.is_clinic_admin(uuid), private.can_access_patient_photo(text) from public;
grant execute on function private.current_clinic_id(), private.has_role(uuid, public.app_role),
  private.is_clinic_member(uuid), private.is_clinic_admin(uuid), private.can_access_patient_photo(text)
  to authenticated, service_role;

-- public wrappers become SECURITY INVOKER so signed-in users cannot call definer functions directly
create or replace function public.current_clinic_id()
returns uuid language sql stable security invoker set search_path to 'public' as $$
  select private.current_clinic_id()
$$;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security invoker set search_path to 'public' as $$
  select private.has_role(_user_id, _role)
$$;

create or replace function public.is_clinic_member(_clinic_id uuid)
returns boolean language sql stable security invoker set search_path to 'public' as $$
  select private.is_clinic_member(_clinic_id)
$$;

create or replace function public.is_clinic_admin(_clinic_id uuid)
returns boolean language sql stable security invoker set search_path to 'public' as $$
  select private.is_clinic_admin(_clinic_id)
$$;

-- storage: scope patient photos to the owning clinic
drop policy if exists "Clinic staff read patient photos" on storage.objects;
drop policy if exists "Clinic staff upload patient photos" on storage.objects;
drop policy if exists "Clinic staff update patient photos" on storage.objects;
drop policy if exists "Clinic staff delete patient photos" on storage.objects;

create policy "Clinic staff read patient photos" on storage.objects for select to authenticated
using (bucket_id = 'patient-photos' and private.can_access_patient_photo(name));

create policy "Clinic staff upload patient photos" on storage.objects for insert to authenticated
with check (bucket_id = 'patient-photos' and private.can_access_patient_photo(name));

create policy "Clinic staff update patient photos" on storage.objects for update to authenticated
using (bucket_id = 'patient-photos' and private.can_access_patient_photo(name))
with check (bucket_id = 'patient-photos' and private.can_access_patient_photo(name));

create policy "Clinic staff delete patient photos" on storage.objects for delete to authenticated
using (bucket_id = 'patient-photos' and private.can_access_patient_photo(name));