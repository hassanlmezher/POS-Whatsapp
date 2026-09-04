begin;

create extension if not exists pgcrypto;

create table if not exists public.whatsapp_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  phone_number_id text not null,
  waba_id text not null,
  phone_number text,
  access_token text not null,
  status text not null default 'connected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_connections_status_check check (status in ('connected', 'disconnected', 'pending', 'error')),
  constraint whatsapp_connections_tenant_phone_key unique (tenant_id, phone_number_id),
  constraint whatsapp_connections_phone_number_id_key unique (phone_number_id)
);

create index if not exists idx_whatsapp_connections_tenant_id on public.whatsapp_connections(tenant_id);

alter table public.whatsapp_connections enable row level security;

drop policy if exists "members read whatsapp connections" on public.whatsapp_connections;
create policy "members read whatsapp connections" on public.whatsapp_connections
for select to authenticated
using (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members insert whatsapp connections" on public.whatsapp_connections;
create policy "members insert whatsapp connections" on public.whatsapp_connections
for insert to authenticated
with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members update whatsapp connections" on public.whatsapp_connections;
create policy "members update whatsapp connections" on public.whatsapp_connections
for update to authenticated
using (tenant_id in (select public.current_tenant_ids()))
with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members delete whatsapp connections" on public.whatsapp_connections;
create policy "members delete whatsapp connections" on public.whatsapp_connections
for delete to authenticated
using (tenant_id in (select public.current_tenant_ids()));

revoke all on public.whatsapp_connections from authenticated;
grant select (
  id,
  tenant_id,
  phone_number_id,
  waba_id,
  phone_number,
  status,
  created_at,
  updated_at
) on public.whatsapp_connections to authenticated;
grant insert, update, delete on public.whatsapp_connections to authenticated;

commit;
