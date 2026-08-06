-- ============================================================================
-- Lendix — de renta mensual a renta quincenal
--
-- Que cambia y por que:
--
--  1. El cliente ahora paga la mitad de la renta cada 15 dias en vez de el
--     monto completo una vez al mes. `monthly_rent` pasa a `biweekly_rent`
--     (ya contiene el monto por quincena, no el monto mensual).
--
--  2. Las cuotas de `rental_payments` ya no se numeran por mes sino por
--     quincena: `month_number` pasa a `installment_number`. La generacion
--     de cuotas (ver update-rental-status.ts) ahora crea term_months * 2
--     cuotas, una cada 15 dias.
--
--  3. El precio de referencia que ve el cliente en el formulario de lista de
--     espera tambien es quincenal: `waitlist_lead.precio_mes` pasa a
--     `precio_quincena`.
--
-- Como aplicarla:
--   supabase link --project-ref yfcyteskghxzmvnsagrt
--   supabase db push
--   (o Dashboard -> SQL Editor -> pegar este archivo -> Run)
--
-- IMPORTANTE: esta migracion solo renombra columnas, no migra los valores
-- existentes (los montos guardados antes de este cambio seguian siendo
-- mensuales). Si ya hay rentas aprobadas con cuotas generadas, revisar a
-- mano las `rental_payments` pendientes antes de aplicar en produccion.
--
-- Es defensiva a proposito: en este proyecto no todas las migraciones
-- anteriores se aplicaron en orden (la 0002, que creaba `precio_mes`, quedo
-- sin aplicar), asi que cada rename primero revisa si la columna vieja
-- existe. Si no existe pero tampoco existe la nueva, la crea de cero para
-- que el esquema quede consistente igual.
-- ============================================================================

-- 1. rental_applications.monthly_rent -> biweekly_rent -----------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rental_applications' and column_name = 'monthly_rent'
  ) then
    alter table public.rental_applications rename column monthly_rent to biweekly_rent;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rental_applications' and column_name = 'biweekly_rent'
  ) then
    alter table public.rental_applications add column biweekly_rent numeric(10, 2) check (biweekly_rent >= 0);
  end if;
end $$;

comment on column public.rental_applications.biweekly_rent is
  'Renta quincenal en USD (se cobra cada 15 dias).';

-- 2. rental_payments.month_number -> installment_number ----------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rental_payments' and column_name = 'month_number'
  ) then
    alter table public.rental_payments rename column month_number to installment_number;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'rental_payments' and column_name = 'installment_number'
  ) then
    alter table public.rental_payments add column installment_number int;
  end if;
end $$;

comment on column public.rental_payments.installment_number is
  'Numero de cuota quincenal: 1, 2, 3... (term_months * 2 cuotas en total).';

-- 3. waitlist_lead.precio_mes -> precio_quincena ------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'waitlist_lead' and column_name = 'precio_mes'
  ) then
    alter table public.waitlist_lead rename column precio_mes to precio_quincena;
  elsif not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'waitlist_lead' and column_name = 'precio_quincena'
  ) then
    alter table public.waitlist_lead add column precio_quincena numeric(10, 2) check (precio_quincena >= 0);
  end if;
end $$;

comment on column public.waitlist_lead.precio_quincena is
  'Renta quincenal en USD que el cliente vio al solicitar. Referencial.';
