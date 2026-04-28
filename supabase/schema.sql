create extension if not exists "pgcrypto";

create type app_role as enum ('owner', 'admin', 'manager', 'cashier', 'support');
create type order_status as enum ('draft', 'processing', 'completed', 'cancelled', 'delivered');
create type payment_status as enum ('pending', 'paid', 'refunded', 'failed');
create type payment_method as enum ('cash', 'card', 'bank_transfer', 'other');
create type conversation_status as enum ('open', 'pending', 'closed');
create type message_direction as enum ('inbound', 'outbound');
create type message_status as enum ('received', 'sent', 'delivered', 'read', 'failed');

create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  currency text not null default 'USD',
  tax_rate numeric(6,5) not null default 0,
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table company_users (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null default 'cashier',
  full_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table branches (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table terminals (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  name text not null,
  code text not null,
  active boolean not null default true,
  unique (company_id, code)
);

create table product_categories (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  icon text,
  sort_order integer not null default 0,
  unique (company_id, name)
);

create table products (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  category_id uuid references product_categories(id) on delete set null,
  name text not null,
  sku text not null,
  description text,
  price numeric(12,2) not null check (price >= 0),
  image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, sku)
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reorder_level integer not null default 0,
  unique (company_id, branch_id, product_id)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  phone text,
  whatsapp_phone text not null,
  avatar_url text,
  notes text not null default '',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, whatsapp_phone)
);

create table whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  business_account_id text not null,
  phone_number_id text not null,
  display_phone_number text not null,
  access_token_secret_ref text,
  token_expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (company_id, phone_number_id)
);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  whatsapp_account_id uuid references whatsapp_accounts(id) on delete set null,
  status conversation_status not null default 'open',
  last_message text,
  last_message_at timestamptz,
  last_inbound_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, customer_id, whatsapp_account_id)
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  direction message_direction not null,
  body text not null,
  status message_status not null default 'received',
  whatsapp_message_id text,
  sent_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  read_at timestamptz,
  unique (company_id, whatsapp_message_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  branch_id uuid references branches(id) on delete set null,
  terminal_id uuid references terminals(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  conversation_id uuid references conversations(id) on delete set null,
  order_number text not null,
  status order_status not null default 'draft',
  payment_status payment_status not null default 'pending',
  subtotal numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, order_number)
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  method payment_method not null,
  amount numeric(12,2) not null check (amount >= 0),
  status payment_status not null default 'pending',
  provider_reference text,
  created_at timestamptz not null default now()
);

create table receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  receipt_number text not null,
  pdf_url text,
  sent_via_whatsapp_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, receipt_number)
);

create table whatsapp_webhook_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  phone_number_id text,
  event_type text not null,
  whatsapp_message_id text,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_company_users_user on company_users(user_id);
create index idx_products_company_category on products(company_id, category_id);
create index idx_inventory_product on inventory(company_id, product_id);
create index idx_customers_company_phone on customers(company_id, whatsapp_phone);
create index idx_conversations_company_last on conversations(company_id, last_message_at desc);
create index idx_messages_conversation_created on messages(conversation_id, created_at);
create index idx_messages_company_status on messages(company_id, status);
create index idx_orders_company_created on orders(company_id, created_at desc);
create index idx_orders_customer on orders(company_id, customer_id);
create index idx_order_items_order on order_items(order_id);
create index idx_payments_order on payments(order_id);
create index idx_webhook_events_message on whatsapp_webhook_events(whatsapp_message_id);

create or replace function user_company_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select company_id from company_users where user_id = auth.uid()
$$;

alter table companies enable row level security;
alter table company_users enable row level security;
alter table branches enable row level security;
alter table terminals enable row level security;
alter table product_categories enable row level security;
alter table products enable row level security;
alter table inventory enable row level security;
alter table customers enable row level security;
alter table whatsapp_accounts enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table receipts enable row level security;
alter table whatsapp_webhook_events enable row level security;

create policy "company members can read companies" on companies for select using (id in (select user_company_ids()));
create policy "company members can read company users" on company_users for select using (company_id in (select user_company_ids()));

create policy "tenant select branches" on branches for select using (company_id in (select user_company_ids()));
create policy "tenant select terminals" on terminals for select using (company_id in (select user_company_ids()));
create policy "tenant select categories" on product_categories for select using (company_id in (select user_company_ids()));
create policy "tenant select products" on products for select using (company_id in (select user_company_ids()));
create policy "tenant select inventory" on inventory for select using (company_id in (select user_company_ids()));
create policy "tenant select customers" on customers for select using (company_id in (select user_company_ids()));
create policy "tenant select conversations" on conversations for select using (company_id in (select user_company_ids()));
create policy "tenant select messages" on messages for select using (company_id in (select user_company_ids()));
create policy "tenant select orders" on orders for select using (company_id in (select user_company_ids()));
create policy "tenant select order items" on order_items for select using (company_id in (select user_company_ids()));
create policy "tenant select payments" on payments for select using (company_id in (select user_company_ids()));
create policy "tenant select receipts" on receipts for select using (company_id in (select user_company_ids()));

-- Add insert/update/delete policies per role. For example, cashiers can create
-- orders/payments, support can create messages, and owners/admins can manage settings.
-- Webhook and checkout route handlers should use the service role key for trusted writes.
