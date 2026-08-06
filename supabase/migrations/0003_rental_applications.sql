-- ============================================================================
-- Lendix — tabla de solicitudes de renta con onboarding KYC
--
-- Flujo: el usuario elige producto y plan en el modal, se autentica con
-- Google, y completa sus datos en /completar-registro. Esta tabla guarda
-- toda la solicitud para revision interna.
--
-- Como aplicarla:
--   Supabase Dashboard -> SQL Editor -> pegar este archivo -> Run
--   (o `supabase db push` si usas el CLI)
-- ============================================================================

create table if not exists public.rental_applications (
  id                 bigint generated always as identity primary key,
  user_id            uuid        not null references auth.users(id) on delete cascade,
  
  -- Producto y plan seleccionado
  product_slug       text        not null,
  product_name       text        not null,
  term_months        int         not null check (term_months in (6, 12)),
  monthly_rent       numeric(10,2) not null check (monthly_rent >= 0),
  
  -- Datos del onboarding
  phone              text        not null,
  address            text        not null,
  city               text        not null,
  
  -- Rutas de archivos KYC en Supabase Storage (bucket: kyc-documents)
  cedula_front_path  text,
  cedula_back_path   text,
  selfie_path        text,
  
  -- Gestion interna
  status             text        not null default 'pending'
                       check (status in ('pending','reviewing','approved','rejected')),
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz default now()
);

-- Indices utiles para el dashboard interno
create index if not exists rental_applications_user_id_idx
  on public.rental_applications (user_id);

create index if not exists rental_applications_status_idx
  on public.rental_applications (status, created_at desc);

create index if not exists rental_applications_created_at_idx
  on public.rental_applications (created_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.rental_applications enable row level security;

-- Usuarios autenticados pueden insertar sus propias solicitudes
drop policy if exists "Usuarios pueden crear solicitudes" on public.rental_applications;
create policy "Usuarios pueden crear solicitudes"
  on public.rental_applications
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Usuarios autenticados pueden ver sus propias solicitudes
drop policy if exists "Usuarios pueden ver sus solicitudes" on public.rental_applications;
create policy "Usuarios pueden ver sus solicitudes"
  on public.rental_applications
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Sin policy de UPDATE/DELETE: solo el dashboard interno puede modificar.

-- ---------------------------------------------------------------------------
-- Storage bucket para documentos KYC
-- NOTA: Crear el bucket 'kyc-documents' desde el dashboard de Supabase:
--   Storage -> New Bucket -> Name: kyc-documents -> Private (no public)
--
-- Luego agregar esta policy en Storage -> Policies:
--   Authenticated users can upload to their own folder
--   (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1])
-- ---------------------------------------------------------------------------
