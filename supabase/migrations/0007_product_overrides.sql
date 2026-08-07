-- ============================================================================
-- Lendix — Tabla product_overrides
--
-- Almacena los precios modificados por administradores para los productos.
-- Se combina con src/data/products.ts para permitir actualizaciones dinamicas
-- sin alterar el catalogo base estatico.
-- ============================================================================

create table if not exists public.product_overrides (
  slug text primary key,
  biweekly numeric not null check (biweekly >= 0),
  retail numeric not null check (retail >= 0),
  updated_at timestamptz not null default now()
);

alter table public.product_overrides enable row level security;

-- Cualquiera (anon u authenticated) puede consultar los precios actualizados
drop policy if exists "Cualquiera puede ver product_overrides" on public.product_overrides;
create policy "Cualquiera puede ver product_overrides"
  on public.product_overrides for select to anon, authenticated
  using (true);

-- Solo administradores (o service_role) pueden crear/modificar overrides
drop policy if exists "Admins pueden actualizar product_overrides" on public.product_overrides;
create policy "Admins pueden actualizar product_overrides"
  on public.product_overrides for all to authenticated
  using (public.is_admin());
