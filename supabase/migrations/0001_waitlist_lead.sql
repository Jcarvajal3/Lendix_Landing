-- ============================================================================
-- Lendix Landing — tabla de leads de la lista de espera
--
-- Como aplicarla:
--   Supabase Dashboard -> SQL Editor -> pegar este archivo -> Run
--   (o `supabase db push` si usas el CLI)
-- ============================================================================

create table if not exists public.waitlist_lead (
  lead_id          uuid primary key default gen_random_uuid(),

  -- Datos del interesado
  nombre           text        not null check (char_length(trim(nombre)) between 2 and 120),
  email            text        not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]{2,}$'),
  telefono         text        check (telefono is null or char_length(telefono) <= 40),
  ciudad           text        check (ciudad is null or char_length(ciudad) <= 120),

  -- Interes declarado: esto es lo que mide la demanda real por producto
  producto_interes text        not null check (char_length(producto_interes) <= 120),
  mensaje          text        check (mensaje is null or char_length(mensaje) <= 500),

  -- Atribucion de campanas publicitarias
  utm_source       text        check (utm_source is null or char_length(utm_source) <= 120),
  utm_medium       text        check (utm_medium is null or char_length(utm_medium) <= 120),
  utm_campaign     text        check (utm_campaign is null or char_length(utm_campaign) <= 120),
  utm_content      text        check (utm_content is null or char_length(utm_content) <= 120),
  referrer         text        check (referrer is null or char_length(referrer) <= 500),

  -- Gestion interna
  status           text        not null default 'NEW'
                                 check (status in ('NEW', 'CONTACTED', 'CONVERTED', 'DISCARDED')),
  notes            text,
  created_at       timestamptz not null default now()
);

-- Un correo, un lugar en la lista. El front trata el 23505 como exito.
create unique index if not exists waitlist_lead_email_key
  on public.waitlist_lead (lower(email));

create index if not exists waitlist_lead_created_at_idx
  on public.waitlist_lead (created_at desc);

create index if not exists waitlist_lead_producto_idx
  on public.waitlist_lead (producto_interes);

-- ---------------------------------------------------------------------------
-- Row Level Security
--
-- La anon key viaja en el navegador, asi que la landing solo puede INSERTAR.
-- Nadie puede leer, editar ni borrar leads con esa key: para eso hay que
-- entrar al dashboard de Supabase o usar la service_role key desde el backend.
-- ---------------------------------------------------------------------------

alter table public.waitlist_lead enable row level security;

drop policy if exists "anon puede registrarse en la lista" on public.waitlist_lead;
create policy "anon puede registrarse en la lista"
  on public.waitlist_lead
  for insert
  to anon
  with check (true);

-- Sin policy de SELECT/UPDATE/DELETE: quedan denegados por defecto.

-- ---------------------------------------------------------------------------
-- Vista de apoyo: demanda por producto.
-- Consultala desde el SQL Editor para ver que producto pide mas la gente.
--   select * from public.waitlist_demanda;
-- ---------------------------------------------------------------------------

create or replace view public.waitlist_demanda as
  select
    producto_interes,
    count(*)                          as leads,
    round(100.0 * count(*) / sum(count(*)) over (), 1) as porcentaje,
    max(created_at)                   as ultimo_lead
  from public.waitlist_lead
  group by producto_interes
  order by leads desc;
