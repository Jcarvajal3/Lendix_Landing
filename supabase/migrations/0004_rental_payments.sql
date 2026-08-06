-- ============================================================================
-- Lendix — tabla de pagos de cuotas de renta
--
-- Cada renta aprobada genera N cuotas mensuales (6 o 12 según el plan).
-- El estado de pago se gestiona manualmente desde el dashboard interno.
--
-- Como aplicarla:
--   Supabase Dashboard -> SQL Editor -> pegar este archivo -> Run
-- ============================================================================

create table if not exists public.rental_payments (
  id            bigint generated always as identity primary key,
  rental_id     bigint      not null references public.rental_applications(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,

  -- Datos de la cuota
  month_number  int         not null,               -- cuota 1, 2, 3...
  amount        numeric(10,2) not null check (amount >= 0),
  status        text        not null default 'pending'
                  check (status in ('pending','paid','overdue')),
  due_date      date        not null,
  paid_at       timestamptz,

  created_at    timestamptz not null default now()
);

-- Indices
create index if not exists rental_payments_rental_id_idx
  on public.rental_payments (rental_id);

create index if not exists rental_payments_user_id_idx
  on public.rental_payments (user_id);

create index if not exists rental_payments_status_idx
  on public.rental_payments (status, due_date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.rental_payments enable row level security;

-- Usuarios pueden ver sus propios pagos
drop policy if exists "Usuarios pueden ver sus pagos" on public.rental_payments;
create policy "Usuarios pueden ver sus pagos"
  on public.rental_payments
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Solo el dashboard interno puede INSERT/UPDATE pagos (service_role key).
-- No se crean policies de INSERT/UPDATE para el rol 'authenticated'.

-- ---------------------------------------------------------------------------
-- Agregar campo 'cancelled_at' a rental_applications para cancelación
-- ---------------------------------------------------------------------------
alter table public.rental_applications
  add column if not exists cancelled_at timestamptz;

-- Usuarios pueden cancelar solicitudes pendientes (update status + cancelled_at)
drop policy if exists "Usuarios pueden cancelar solicitudes pendientes" on public.rental_applications;
create policy "Usuarios pueden cancelar solicitudes pendientes"
  on public.rental_applications
  for update
  to authenticated
  using (auth.uid() = user_id AND status = 'pending')
  with check (auth.uid() = user_id AND status = 'cancelled');

-- Agregar 'cancelled' al check constraint de status
-- Primero eliminar el constraint existente y recrearlo
alter table public.rental_applications
  drop constraint if exists rental_applications_status_check;

alter table public.rental_applications
  add constraint rental_applications_status_check
    check (status in ('pending','reviewing','approved','rejected','cancelled'));
