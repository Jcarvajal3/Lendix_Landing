-- ============================================================================
-- Lendix — Tabla user_profiles + Roles + RLS + Admin policies
--
-- Este archivo consolida todo lo necesario para el admin dashboard:
--   1. Tabla user_profiles con roles
--   2. Trigger automático para crear perfil al registrarse
--   3. Backfill de usuarios existentes
--   4. Función is_admin() para uso en policies
--   5. RLS policies para user_profiles y tablas admin
--
-- Roles:
--   'cliente'    — usuario regular, acceso solo a /mi-cuenta
--   'admin'      — acceso completo al dashboard
--   'superadmin' — igual que admin (por ahora)
--
-- Como aplicarla:
--   Supabase Dashboard -> SQL Editor -> pegar este archivo -> Run
-- ============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. TABLA USER_PROFILES
-- ═══════════════════════════════════════════════════════════════════════════

create table if not exists public.user_profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text,
  email                 text,
  phone                 text,
  cedula                text,
  avatar_url            text,
  address               text,
  role                  text not null default 'cliente'
                          check (role in ('cliente', 'admin', 'superadmin')),
  registration_complete boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists user_profiles_role_idx on public.user_profiles (role);
create index if not exists user_profiles_email_idx on public.user_profiles (email);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. FUNCIÓN is_admin()
-- ═══════════════════════════════════════════════════════════════════════════
-- Usada en policies de otras tablas para verificar si el usuario actual
-- tiene rol admin/superadmin. SECURITY DEFINER para poder consultar
-- user_profiles desde dentro de policies de otras tablas.

create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and role in ('admin', 'superadmin')
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. RLS POLICIES — user_profiles
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.user_profiles enable row level security;

-- Cada usuario puede leer su propio perfil
drop policy if exists "Usuarios pueden ver su perfil" on public.user_profiles;
create policy "Usuarios pueden ver su perfil"
  on public.user_profiles for select to authenticated
  using (auth.uid() = id);

-- Cada usuario puede actualizar su propio perfil
drop policy if exists "Usuarios pueden actualizar su perfil" on public.user_profiles;
create policy "Usuarios pueden actualizar su perfil"
  on public.user_profiles for update to authenticated
  using (auth.uid() = id);

-- Permitir INSERT para que el trigger cree perfiles
drop policy if exists "Service puede insertar perfiles" on public.user_profiles;
create policy "Service puede insertar perfiles"
  on public.user_profiles for insert to authenticated
  with check (auth.uid() = id);

-- Limpiar policy recursiva si existe (de versiones anteriores)
drop policy if exists "Admins pueden ver todos los perfiles" on public.user_profiles;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RLS POLICIES — Admin access a otras tablas
-- ═══════════════════════════════════════════════════════════════════════════
-- Los admins usan service_role key (que bypasea RLS) para queries admin.
-- Estas policies son un safety net adicional para acceso via anon key.

-- rental_applications: admins pueden ver y editar todas
drop policy if exists "Admins pueden ver todas las solicitudes" on public.rental_applications;
create policy "Admins pueden ver todas las solicitudes"
  on public.rental_applications for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins pueden actualizar solicitudes" on public.rental_applications;
create policy "Admins pueden actualizar solicitudes"
  on public.rental_applications for update to authenticated
  using (public.is_admin());

-- rental_payments: admins pueden ver y editar todos
drop policy if exists "Admins pueden ver todos los pagos" on public.rental_payments;
create policy "Admins pueden ver todos los pagos"
  on public.rental_payments for select to authenticated
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "Admins pueden actualizar pagos" on public.rental_payments;
create policy "Admins pueden actualizar pagos"
  on public.rental_payments for update to authenticated
  using (public.is_admin());

drop policy if exists "Admins pueden insertar pagos" on public.rental_payments;
create policy "Admins pueden insertar pagos"
  on public.rental_payments for insert to authenticated
  with check (public.is_admin());

-- waitlist_lead: admins pueden leer todos los leads
drop policy if exists "Admins pueden ver todos los leads" on public.waitlist_lead;
create policy "Admins pueden ver todos los leads"
  on public.waitlist_lead for select to authenticated
  using (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER — Crear perfil automáticamente al registrar usuario
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, full_name, email, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    'cliente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. BACKFILL — Crear perfiles para usuarios existentes
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.user_profiles (id, full_name, email, avatar_url, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.email,
  u.raw_user_meta_data->>'avatar_url',
  'cliente'
from auth.users u
where not exists (
  select 1 from public.user_profiles p where p.id = u.id
)
on conflict (id) do nothing;
