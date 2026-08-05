-- ============================================================================
-- Lendix Landing — de "lista de espera" a "solicitud de renta"
--
-- Que cambia y por que:
--
--  1. WhatsApp pasa a ser el canal principal de cierre, asi que el formulario
--     ya no pide correo obligatorio. `email` deja de ser NOT NULL y en su
--     lugar exigimos que venga AL MENOS UNO de los dos contactos.
--
--  2. Un cliente puede solicitar mas de un producto (esa es justamente la
--     conversion que queremos). El indice unico por correo lo impedia, asi
--     que se elimina.
--
--  3. Guardamos el plan y el precio que el cliente vio al solicitar. Sin esto
--     ventas no sabe si pidio mes a mes o 12 meses, ni a que precio.
--
-- Como aplicarla:
--   supabase link --project-ref yfcyteskghxzmvnsagrt
--   supabase db push
--   (o Dashboard -> SQL Editor -> pegar este archivo -> Run)
--
-- IMPORTANTE: el formulario nuevo falla mientras esta migracion no este
-- aplicada (los envios sin correo violan el NOT NULL de `email`).
-- ============================================================================

-- 1. El correo pasa a ser opcional -------------------------------------------
alter table public.waitlist_lead
  alter column email drop not null;

-- Un lead sin ninguna forma de contacto no sirve para nada.
alter table public.waitlist_lead
  drop constraint if exists waitlist_lead_contacto_check;

alter table public.waitlist_lead
  add constraint waitlist_lead_contacto_check
  check (email is not null or telefono is not null);

-- 2. Un mismo cliente puede pedir varios productos ---------------------------
drop index if exists public.waitlist_lead_email_key;

-- 3. Contexto comercial de la solicitud --------------------------------------
alter table public.waitlist_lead
  add column if not exists plan text
    check (plan is null or plan in ('libre', 'anual'));

alter table public.waitlist_lead
  add column if not exists precio_mes numeric(10, 2)
    check (precio_mes is null or precio_mes >= 0);

comment on column public.waitlist_lead.plan is
  'Plan que el cliente eligio en el catalogo: libre (mes a mes) o anual (12 meses, -20%).';
comment on column public.waitlist_lead.precio_mes is
  'Renta mensual en USD que el cliente vio al solicitar. Referencial.';

-- 4. La vista de demanda sigue funcionando, pero ahora tambien por plan ------
create or replace view public.waitlist_demanda as
  select
    producto_interes,
    count(*)                                           as solicitudes,
    count(*) filter (where plan = 'anual')             as plan_12_meses,
    count(*) filter (where telefono is not null)       as con_whatsapp,
    round(100.0 * count(*) / sum(count(*)) over (), 1) as porcentaje,
    max(created_at)                                    as ultima_solicitud
  from public.waitlist_lead
  group by producto_interes
  order by solicitudes desc;
