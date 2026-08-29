begin;

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('owner', 'admin', 'manager', 'cashier', 'support');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_status as enum ('draft', 'processing', 'completed', 'cancelled', 'delivered');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_status as enum ('pending', 'paid', 'refunded', 'failed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('cash', 'card', 'bank_transfer', 'other');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.conversation_status as enum ('open', 'pending', 'closed');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.message_direction as enum ('inbound', 'outbound');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.message_status as enum ('received', 'sent', 'delivered', 'read', 'failed');
exception when duplicate_object then null; end $$;

-- 1. Create the tenant and membership tables without assuming an empty database.
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text,
  slug text,
  whatsapp_phone_number text,
  whatsapp_phone_number_id text,
  whatsapp_business_account_id text,
  currency text default 'USD',
  tax_rate numeric(7,6) default 0,
  timezone text default 'UTC',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tenants add column if not exists name text;
alter table public.tenants add column if not exists slug text;
alter table public.tenants add column if not exists whatsapp_phone_number text;
alter table public.tenants add column if not exists whatsapp_phone_number_id text;
alter table public.tenants add column if not exists whatsapp_business_account_id text;
alter table public.tenants add column if not exists currency text default 'USD';
alter table public.tenants add column if not exists tax_rate numeric(7,6) default 0;
alter table public.tenants add column if not exists timezone text default 'UTC';
alter table public.tenants add column if not exists created_at timestamptz default now();
alter table public.tenants add column if not exists updated_at timestamptz default now();

create table if not exists public.tenant_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid,
  tenant_id uuid,
  name text,
  role public.app_role,
  created_at timestamptz default now()
);

alter table public.tenant_users add column if not exists auth_user_id uuid;
alter table public.tenant_users add column if not exists tenant_id uuid;
alter table public.tenant_users add column if not exists name text;
alter table public.tenant_users add column if not exists role public.app_role;
alter table public.tenant_users add column if not exists created_at timestamptz default now();

-- Preserve every legacy company as a tenant with the same UUID, so company_id
-- can be copied to tenant_id without remapping or losing ownership.
do $$
begin
  if to_regclass('public.companies') is not null then
    insert into public.tenants (id, name, slug, currency, tax_rate, timezone, created_at, updated_at)
    select
      company.id,
      coalesce(nullif(trim(company.name), ''), 'Tenant ' || company.id::text),
      'legacy-' || replace(company.id::text, '-', ''),
      coalesce(company.currency, 'USD'),
      coalesce(company.tax_rate, 0),
      coalesce(company.timezone, 'UTC'),
      coalesce(company.created_at, now()),
      coalesce(company.updated_at, now())
    from public.companies company
    on conflict (id) do update
    set currency = coalesce(public.tenants.currency, excluded.currency),
        tax_rate = coalesce(public.tenants.tax_rate, excluded.tax_rate),
        timezone = coalesce(public.tenants.timezone, excluded.timezone);
  end if;
end $$;

-- Reuse the existing development company UUID when present. Otherwise create
-- a normal generated UUID. WhatsApp identifiers are tenant configuration and
-- are never seeded or overwritten by the structural schema.
do $$
declare
  development_tenant_id uuid;
begin
  select id into development_tenant_id
  from public.tenants
  where slug = 'inchouf-test-business'
  limit 1;

  if development_tenant_id is null and to_regclass('public.companies') is not null then
    select id into development_tenant_id
    from public.companies
    where name = 'GreenStore POS'
    order by created_at asc
    limit 1;
  end if;

  if development_tenant_id is null then
    insert into public.tenants (
      name,
      slug
    )
    values (
      'InChouf Test Business',
      'inchouf-test-business'
    )
    returning id into development_tenant_id;
  else
    update public.tenants
    set name = 'InChouf Test Business',
        slug = 'inchouf-test-business'
    where id = development_tenant_id;
  end if;
end $$;

update public.tenants
set name = coalesce(nullif(trim(name), ''), 'Tenant ' || id::text),
    slug = coalesce(nullif(trim(slug), ''), 'legacy-' || replace(id::text, '-', '')),
    currency = coalesce(currency, 'USD'),
    tax_rate = coalesce(tax_rate, 0),
    timezone = coalesce(timezone, 'UTC'),
    created_at = coalesce(created_at, now()),
    updated_at = coalesce(updated_at, now());

create unique index if not exists ux_tenants_slug on public.tenants(slug);
create unique index if not exists ux_tenants_whatsapp_phone_number
  on public.tenants(whatsapp_phone_number) where whatsapp_phone_number is not null;
create unique index if not exists ux_tenants_whatsapp_phone_number_id
  on public.tenants(whatsapp_phone_number_id) where whatsapp_phone_number_id is not null;

alter table public.tenants alter column name set not null;
alter table public.tenants alter column slug set not null;
alter table public.tenants alter column currency set not null;
alter table public.tenants alter column tax_rate set not null;
alter table public.tenants alter column created_at set not null;
alter table public.tenants alter column updated_at set not null;

-- 2. Ensure all application tables exist. Existing legacy tables are preserved.
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.terminals (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  branch_id uuid not null,
  name text not null,
  code text not null,
  active boolean not null default true
);

create table if not exists public.product_categories (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  name text not null,
  icon text,
  sort_order integer not null default 0
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  category_id uuid,
  name text not null,
  description text,
  sku text not null,
  price numeric(12,2) not null default 0,
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  branch_id uuid not null,
  product_id uuid not null,
  quantity integer not null default 0,
  reorder_level integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  name text not null,
  phone text,
  whatsapp_phone text not null,
  avatar_url text,
  notes text,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  customer_id uuid not null,
  status public.conversation_status not null default 'open',
  last_message text,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  conversation_id uuid not null,
  customer_id uuid not null,
  message_type text not null default 'text',
  direction public.message_direction not null,
  body text not null,
  status public.message_status not null,
  whatsapp_message_id text,
  media_id text,
  media_mime_type text,
  media_sha256 text,
  media_is_voice boolean not null default false,
  media_duration_seconds integer,
  media_file_size integer,
  media_storage_bucket text,
  media_storage_path text,
  media_file_name text,
  media_error text,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  customer_id uuid,
  conversation_id uuid,
  order_number text not null,
  status public.order_status not null default 'draft',
  payment_status public.payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  order_id uuid not null,
  product_id uuid,
  product_name text not null,
  quantity integer not null,
  unit_price numeric(12,2) not null,
  line_total numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  order_id uuid not null,
  method public.payment_method not null,
  amount numeric(12,2) not null,
  status public.payment_status not null default 'pending',
  provider_reference text,
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  order_id uuid not null,
  receipt_number text not null,
  pdf_url text,
  sent_via_whatsapp_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  phone_number_id text,
  event_type text not null,
  whatsapp_message_id text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid,
  conversation_id uuid not null,
  suggestion_text text not null,
  provider text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. Add tenant_id before any index, FK, function, trigger, or policy uses it.
alter table public.branches add column if not exists tenant_id uuid;
alter table public.terminals add column if not exists tenant_id uuid;
alter table public.product_categories add column if not exists tenant_id uuid;
alter table public.products add column if not exists tenant_id uuid;
alter table public.inventory add column if not exists tenant_id uuid;
alter table public.customers add column if not exists tenant_id uuid;
alter table public.conversations add column if not exists tenant_id uuid;
alter table public.messages add column if not exists tenant_id uuid;
alter table public.orders add column if not exists tenant_id uuid;
alter table public.order_items add column if not exists tenant_id uuid;
alter table public.payments add column if not exists tenant_id uuid;
alter table public.receipts add column if not exists tenant_id uuid;
alter table public.whatsapp_webhook_events add column if not exists tenant_id uuid;
alter table public.ai_suggestions add column if not exists tenant_id uuid;

alter table public.inventory add column if not exists updated_at timestamptz default now();
alter table public.order_items add column if not exists created_at timestamptz default now();
alter table public.messages add column if not exists message_type text not null default 'text';
alter table public.messages add column if not exists media_id text;
alter table public.messages add column if not exists media_mime_type text;
alter table public.messages add column if not exists media_sha256 text;
alter table public.messages add column if not exists media_is_voice boolean not null default false;
alter table public.messages add column if not exists media_duration_seconds integer;
alter table public.messages add column if not exists media_file_size integer;
alter table public.messages add column if not exists media_storage_bucket text;
alter table public.messages add column if not exists media_storage_path text;
alter table public.messages add column if not exists media_file_name text;
alter table public.messages add column if not exists media_error text;

alter table public.messages drop constraint if exists messages_message_type_check;
alter table public.messages add constraint messages_message_type_check
  check (message_type in ('text', 'audio', 'unsupported'));

update public.messages
set message_type = 'audio',
    body = '🎤 Voice message'
where body = '[audio message]';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'whatsapp-audio',
  'whatsapp-audio',
  false,
  26214400,
  array['audio/aac', 'audio/amr', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/opus', 'audio/webm']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Add tenant ownership to legacy/optional business tables only when they exist.
do $$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'whatsapp_accounts',
    'categories',
    'employees',
    'settings',
    'company_settings',
    'business_settings'
  ] loop
    if to_regclass('public.' || owned_table) is not null then
      execute format('alter table public.%I add column if not exists tenant_id uuid', owned_table);
    end if;
  end loop;
end $$;

-- 4. Backfill legacy company-owned rows. Every company was copied to tenants
-- with the same UUID, so this is deterministic and preserves all ownership.
do $$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'branches',
    'terminals',
    'product_categories',
    'products',
    'inventory',
    'customers',
    'conversations',
    'messages',
    'orders',
    'order_items',
    'payments',
    'receipts',
    'whatsapp_webhook_events',
    'ai_suggestions',
    'whatsapp_accounts',
    'categories',
    'employees',
    'settings',
    'company_settings',
    'business_settings'
  ] loop
    if to_regclass('public.' || owned_table) is not null
       and exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = owned_table
           and column_name = 'company_id'
       ) then
      execute format(
        'update public.%I row_to_migrate
         set tenant_id = row_to_migrate.company_id
         where row_to_migrate.tenant_id is null
           and row_to_migrate.company_id is not null
           and exists (select 1 from public.tenants tenant where tenant.id = row_to_migrate.company_id)',
        owned_table
      );
    end if;
  end loop;
end $$;

-- Current application writes tenant_id only. Legacy company_id columns and
-- their existing values are retained, but their NOT NULL requirement is
-- relaxed so new tenant-native rows do not need a duplicate ownership field.
-- Legacy writers that still provide company_id are synchronized into tenant_id.
create or replace function public.sync_legacy_company_tenant_id()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.tenant_id is null and new.company_id is not null then
    new.tenant_id := new.company_id;
  elsif new.tenant_id is not null
        and new.company_id is not null
        and new.tenant_id <> new.company_id then
    raise exception 'tenant_id and company_id must identify the same owner';
  end if;

  return new;
end;
$$;

do $$
declare
  owned_table text;
begin
  foreach owned_table in array array[
    'branches',
    'terminals',
    'product_categories',
    'products',
    'inventory',
    'customers',
    'conversations',
    'messages',
    'orders',
    'order_items',
    'payments',
    'receipts',
    'whatsapp_webhook_events',
    'ai_suggestions',
    'whatsapp_accounts',
    'categories',
    'employees',
    'settings',
    'company_settings',
    'business_settings'
  ] loop
    if to_regclass('public.' || owned_table) is not null
       and exists (
         select 1
         from information_schema.columns
         where table_schema = 'public'
           and table_name = owned_table
           and column_name = 'company_id'
       ) then
      execute format('alter table public.%I alter column company_id drop not null', owned_table);
      execute format('drop trigger if exists sync_legacy_company_tenant_id on public.%I', owned_table);
      execute format(
        'create trigger sync_legacy_company_tenant_id
         before insert or update on public.%I
         for each row execute function public.sync_legacy_company_tenant_id()',
        owned_table
      );
    end if;
  end loop;
end $$;

-- Preserve legacy user memberships when present. One auth user resolves to one
-- tenant in the current application, so the oldest membership wins on migration.
do $$
begin
  if to_regclass('public.company_users') is not null then
    insert into public.tenant_users (auth_user_id, tenant_id, name, role, created_at)
    select distinct on (legacy_user.user_id)
      legacy_user.user_id,
      legacy_user.company_id,
      coalesce(nullif(trim(legacy_user.full_name), ''), auth_user.email, 'User'),
      legacy_user.role::text::public.app_role,
      coalesce(legacy_user.created_at, now())
    from public.company_users legacy_user
    join auth.users auth_user on auth_user.id = legacy_user.user_id
    join public.tenants tenant on tenant.id = legacy_user.company_id
    where legacy_user.user_id is not null
      and not exists (
        select 1 from public.tenant_users existing
        where existing.auth_user_id = legacy_user.user_id
      )
    order by legacy_user.user_id, legacy_user.created_at asc;
  end if;
end $$;

-- 5. Add indexes only after all tenant_id columns exist and are backfilled.
create unique index if not exists ux_tenant_users_auth_user on public.tenant_users(auth_user_id);
create index if not exists idx_tenant_users_tenant on public.tenant_users(tenant_id);
create unique index if not exists ux_branches_tenant_name on public.branches(tenant_id, name);
create unique index if not exists ux_terminals_tenant_code on public.terminals(tenant_id, code);
create unique index if not exists ux_product_categories_tenant_name on public.product_categories(tenant_id, name);
create unique index if not exists ux_products_tenant_sku on public.products(tenant_id, sku);
create unique index if not exists ux_inventory_tenant_branch_product on public.inventory(tenant_id, branch_id, product_id);
create unique index if not exists ux_customers_tenant_whatsapp on public.customers(tenant_id, whatsapp_phone);
create unique index if not exists ux_conversations_tenant_customer on public.conversations(tenant_id, customer_id);
create unique index if not exists ux_messages_tenant_whatsapp_id on public.messages(tenant_id, whatsapp_message_id);
create unique index if not exists ux_orders_tenant_order_number on public.orders(tenant_id, order_number);
create unique index if not exists ux_receipts_tenant_receipt_number on public.receipts(tenant_id, receipt_number);

create index if not exists idx_products_tenant_category on public.products(tenant_id, category_id);
create index if not exists idx_inventory_tenant_product on public.inventory(tenant_id, product_id);
create index if not exists idx_customers_tenant_phone on public.customers(tenant_id, whatsapp_phone);
create index if not exists idx_conversations_tenant_last on public.conversations(tenant_id, last_message_at desc);
create index if not exists idx_messages_conversation_created on public.messages(conversation_id, created_at);
create index if not exists idx_messages_tenant_status on public.messages(tenant_id, status);
create index if not exists idx_messages_tenant_media_id on public.messages(tenant_id, media_id)
  where media_id is not null;
create index if not exists idx_messages_tenant_audio_storage on public.messages(tenant_id, media_storage_bucket, media_storage_path)
  where message_type = 'audio' and media_storage_path is not null;
create index if not exists idx_orders_tenant_created on public.orders(tenant_id, created_at desc);
create index if not exists idx_orders_tenant_customer on public.orders(tenant_id, customer_id);
create index if not exists idx_order_items_tenant_order on public.order_items(tenant_id, order_id);
create index if not exists idx_payments_tenant_order on public.payments(tenant_id, order_id);
create index if not exists idx_webhook_phone_created on public.whatsapp_webhook_events(phone_number_id, created_at desc);
create index if not exists idx_ai_suggestions_tenant_conversation
  on public.ai_suggestions(tenant_id, conversation_id, created_at desc);

-- 6. Add tenant foreign keys idempotently. NOT VALID prevents old unrelated
-- rows from blocking the migration; constraints are validated when no orphans exist.
do $$
declare
  owned_table text;
  constraint_name text;
  delete_action text;
  has_orphans boolean;
begin
  foreach owned_table in array array[
    'tenant_users',
    'branches',
    'terminals',
    'product_categories',
    'products',
    'inventory',
    'customers',
    'conversations',
    'messages',
    'orders',
    'order_items',
    'payments',
    'receipts',
    'whatsapp_webhook_events',
    'ai_suggestions',
    'whatsapp_accounts',
    'categories',
    'employees',
    'settings',
    'company_settings',
    'business_settings'
  ] loop
    if to_regclass('public.' || owned_table) is null then
      continue;
    end if;

    constraint_name := owned_table || '_tenant_id_fkey';
    delete_action := case
      when owned_table = 'whatsapp_webhook_events' then 'set null'
      else 'cascade'
    end;

    if not exists (
      select 1
      from pg_constraint
      where conrelid = to_regclass('public.' || owned_table)
        and conname = constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (tenant_id) references public.tenants(id) on delete %s not valid',
        owned_table,
        constraint_name,
        delete_action
      );
    end if;

    execute format(
      'select exists (
         select 1 from public.%I owned
         where owned.tenant_id is not null
           and not exists (select 1 from public.tenants tenant where tenant.id = owned.tenant_id)
       )',
      owned_table
    ) into has_orphans;

    if not has_orphans then
      execute format('alter table public.%I validate constraint %I', owned_table, constraint_name);
    end if;
  end loop;
end $$;

-- Tenant-aware relationship keys prevent a child row from naming one tenant
-- while referencing a parent row owned by another tenant. The primary-key id
-- is already globally unique; these indexes additionally make (tenant_id, id)
-- available as a composite foreign-key target.
create unique index if not exists ux_branches_tenant_id_id on public.branches(tenant_id, id);
create unique index if not exists ux_product_categories_tenant_id_id on public.product_categories(tenant_id, id);
create unique index if not exists ux_products_tenant_id_id on public.products(tenant_id, id);
create unique index if not exists ux_customers_tenant_id_id on public.customers(tenant_id, id);
create unique index if not exists ux_conversations_tenant_id_id on public.conversations(tenant_id, id);
create unique index if not exists ux_orders_tenant_id_id on public.orders(tenant_id, id);

do $$
declare
  relation record;
  has_mismatches boolean;
begin
  for relation in
    select *
    from (values
      ('terminals', 'branch_id', 'branches', 'terminals_branch_tenant_fkey', 'cascade'),
      ('products', 'category_id', 'product_categories', 'products_category_tenant_fkey', 'no action'),
      ('inventory', 'branch_id', 'branches', 'inventory_branch_tenant_fkey', 'cascade'),
      ('inventory', 'product_id', 'products', 'inventory_product_tenant_fkey', 'cascade'),
      ('conversations', 'customer_id', 'customers', 'conversations_customer_tenant_fkey', 'cascade'),
      ('messages', 'conversation_id', 'conversations', 'messages_conversation_tenant_fkey', 'cascade'),
      ('messages', 'customer_id', 'customers', 'messages_customer_tenant_fkey', 'cascade'),
      ('orders', 'customer_id', 'customers', 'orders_customer_tenant_fkey', 'no action'),
      ('orders', 'conversation_id', 'conversations', 'orders_conversation_tenant_fkey', 'no action'),
      ('order_items', 'order_id', 'orders', 'order_items_order_tenant_fkey', 'cascade'),
      ('order_items', 'product_id', 'products', 'order_items_product_tenant_fkey', 'no action'),
      ('payments', 'order_id', 'orders', 'payments_order_tenant_fkey', 'cascade'),
      ('receipts', 'order_id', 'orders', 'receipts_order_tenant_fkey', 'cascade'),
      ('ai_suggestions', 'conversation_id', 'conversations', 'ai_suggestions_conversation_tenant_fkey', 'cascade')
    ) as relationships(child_table, child_column, parent_table, constraint_name, delete_action)
  loop
    if not exists (
      select 1
      from pg_constraint
      where conrelid = to_regclass('public.' || relation.child_table)
        and conname = relation.constraint_name
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (tenant_id, %I) references public.%I(tenant_id, id) on delete %s not valid',
        relation.child_table,
        relation.constraint_name,
        relation.child_column,
        relation.parent_table,
        relation.delete_action
      );
    end if;

    execute format(
      'select exists (
         select 1
         from public.%I child
         left join public.%I parent
           on parent.tenant_id = child.tenant_id
          and parent.id = child.%I
         where child.%I is not null
           and parent.id is null
       )',
      relation.child_table,
      relation.parent_table,
      relation.child_column,
      relation.child_column
    ) into has_mismatches;

    if not has_mismatches then
      execute format(
        'alter table public.%I validate constraint %I',
        relation.child_table,
        relation.constraint_name
      );
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tenant_users'::regclass
      and conname = 'tenant_users_auth_user_id_fkey'
  ) then
    alter table public.tenant_users
      add constraint tenant_users_auth_user_id_fkey
      foreign key (auth_user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1
    from public.tenant_users membership
    where membership.auth_user_id is not null
      and not exists (select 1 from auth.users auth_user where auth_user.id = membership.auth_user_id)
  ) then
    alter table public.tenant_users validate constraint tenant_users_auth_user_id_fkey;
  end if;
end $$;

-- 7. Apply NOT NULL only when every preserved row was safely backfilled.
do $$
declare
  owned_table text;
  has_null_tenant boolean;
begin
  foreach owned_table in array array[
    'tenant_users',
    'branches',
    'terminals',
    'product_categories',
    'products',
    'inventory',
    'customers',
    'conversations',
    'messages',
    'orders',
    'order_items',
    'payments',
    'receipts',
    'ai_suggestions',
    'whatsapp_accounts',
    'categories',
    'employees',
    'settings',
    'company_settings',
    'business_settings'
  ] loop
    if to_regclass('public.' || owned_table) is null then
      continue;
    end if;

    execute format('select exists (select 1 from public.%I where tenant_id is null)', owned_table)
      into has_null_tenant;

    if not has_null_tenant then
      execute format('alter table public.%I alter column tenant_id set not null', owned_table);
    end if;
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from public.tenant_users where auth_user_id is null) then
    alter table public.tenant_users alter column auth_user_id set not null;
  end if;
  if not exists (select 1 from public.tenant_users where name is null or trim(name) = '') then
    alter table public.tenant_users alter column name set not null;
  end if;
  if not exists (select 1 from public.tenant_users where role is null) then
    alter table public.tenant_users alter column role set not null;
  end if;
end $$;

-- 8. Updated-at triggers are created only after their columns are present.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at before update on public.tenants
for each row execute function public.set_updated_at();
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at before update on public.products
for each row execute function public.set_updated_at();
drop trigger if exists inventory_set_updated_at on public.inventory;
create trigger inventory_set_updated_at before update on public.inventory
for each row execute function public.set_updated_at();
drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers
for each row execute function public.set_updated_at();
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders
for each row execute function public.set_updated_at();

-- 9. Membership-derived RLS is installed only after tenant_users is complete.
create or replace function public.current_tenant_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select membership.tenant_id
  from public.tenant_users membership
  where membership.auth_user_id = auth.uid()
$$;

revoke all on function public.current_tenant_ids() from public;
grant execute on function public.current_tenant_ids() to authenticated;

alter table public.tenants enable row level security;
alter table public.tenant_users enable row level security;
alter table public.branches enable row level security;
alter table public.terminals enable row level security;
alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.inventory enable row level security;
alter table public.customers enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.receipts enable row level security;
alter table public.whatsapp_webhook_events enable row level security;
alter table public.ai_suggestions enable row level security;

-- Remove the legacy company-membership read policies so tenant_users is the
-- only browser authority. Legacy tables and rows themselves remain untouched.
drop policy if exists "tenant select branches" on public.branches;
drop policy if exists "tenant select terminals" on public.terminals;
drop policy if exists "tenant select categories" on public.product_categories;
drop policy if exists "tenant select products" on public.products;
drop policy if exists "tenant select inventory" on public.inventory;
drop policy if exists "tenant select customers" on public.customers;
drop policy if exists "tenant select conversations" on public.conversations;
drop policy if exists "tenant select messages" on public.messages;
drop policy if exists "tenant select orders" on public.orders;
drop policy if exists "tenant select order items" on public.order_items;
drop policy if exists "tenant select payments" on public.payments;
drop policy if exists "tenant select receipts" on public.receipts;
drop policy if exists "tenant select ai suggestions" on public.ai_suggestions;

drop policy if exists "users read own membership" on public.tenant_users;
create policy "users read own membership" on public.tenant_users
for select to authenticated using (auth_user_id = auth.uid());

drop policy if exists "members read tenant" on public.tenants;
create policy "members read tenant" on public.tenants
for select to authenticated using (id in (select public.current_tenant_ids()));

drop policy if exists "members read branches" on public.branches;
create policy "members read branches" on public.branches
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read terminals" on public.terminals;
create policy "members read terminals" on public.terminals
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read categories" on public.product_categories;
create policy "members read categories" on public.product_categories
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read products" on public.products;
create policy "members read products" on public.products
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read inventory" on public.inventory;
create policy "members read inventory" on public.inventory
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read customers" on public.customers;
create policy "members read customers" on public.customers
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read conversations" on public.conversations;
create policy "members read conversations" on public.conversations
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read messages" on public.messages;
create policy "members read messages" on public.messages
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read orders" on public.orders;
create policy "members read orders" on public.orders
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read order items" on public.order_items;
create policy "members read order items" on public.order_items
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read payments" on public.payments;
create policy "members read payments" on public.payments
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read receipts" on public.receipts;
create policy "members read receipts" on public.receipts
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));
drop policy if exists "members read ai suggestions" on public.ai_suggestions;
create policy "members read ai suggestions" on public.ai_suggestions
for select to authenticated using (tenant_id in (select public.current_tenant_ids()));

-- Optional legacy business tables receive the same tenant read policy when present.
do $$
declare
  owned_table text;
begin
  foreach owned_table in array array['categories', 'employees', 'settings', 'company_settings', 'business_settings'] loop
    if to_regclass('public.' || owned_table) is not null then
      execute format('alter table public.%I enable row level security', owned_table);
      execute format('drop policy if exists "members read tenant data" on public.%I', owned_table);
      execute format(
        'create policy "members read tenant data" on public.%I for select to authenticated using (tenant_id in (select public.current_tenant_ids()))',
        owned_table
      );
      execute format('grant select on public.%I to authenticated', owned_table);
    end if;
  end loop;
end $$;

grant usage on schema public to authenticated;
grant select on public.tenants, public.tenant_users, public.branches, public.terminals,
  public.product_categories, public.products, public.inventory, public.customers,
  public.conversations, public.messages, public.orders, public.order_items,
  public.payments, public.receipts, public.ai_suggestions to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

commit;
