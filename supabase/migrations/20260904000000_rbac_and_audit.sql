begin;

create extension if not exists pgcrypto;

create table if not exists public.permissions (
  id text primary key,
  description text not null
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  is_system boolean not null default false,
  constraint roles_tenant_id_name_key unique (tenant_id, name),
  constraint roles_name_not_blank check (length(trim(name)) > 0)
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  permission_id text not null references public.permissions(id) on delete cascade,
  primary key (role_id, permission_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  resource text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_logs_action_not_blank check (length(trim(action)) > 0),
  constraint audit_logs_resource_not_blank check (length(trim(resource)) > 0)
);

create index if not exists idx_roles_tenant_id on public.roles(tenant_id);
create index if not exists idx_role_permissions_permission_id on public.role_permissions(permission_id);
create index if not exists idx_audit_logs_tenant_id_created_at on public.audit_logs(tenant_id, created_at desc);
create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);

alter table public.permissions enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "authenticated read permissions" on public.permissions;
create policy "authenticated read permissions" on public.permissions
for select to authenticated using (true);

drop policy if exists "members read roles" on public.roles;
create policy "members read roles" on public.roles
for select to authenticated
using (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members insert roles" on public.roles;
create policy "members insert roles" on public.roles
for insert to authenticated
with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members update roles" on public.roles;
create policy "members update roles" on public.roles
for update to authenticated
using (tenant_id in (select public.current_tenant_ids()))
with check (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members delete roles" on public.roles;
create policy "members delete roles" on public.roles
for delete to authenticated
using (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members read role permissions" on public.role_permissions;
create policy "members read role permissions" on public.role_permissions
for select to authenticated
using (
  exists (
    select 1
    from public.roles rbac_role
    where rbac_role.id = role_permissions.role_id
      and rbac_role.tenant_id in (select public.current_tenant_ids())
  )
);

drop policy if exists "members insert role permissions" on public.role_permissions;
create policy "members insert role permissions" on public.role_permissions
for insert to authenticated
with check (
  exists (
    select 1
    from public.roles rbac_role
    where rbac_role.id = role_permissions.role_id
      and rbac_role.tenant_id in (select public.current_tenant_ids())
  )
);

drop policy if exists "members update role permissions" on public.role_permissions;
create policy "members update role permissions" on public.role_permissions
for update to authenticated
using (
  exists (
    select 1
    from public.roles rbac_role
    where rbac_role.id = role_permissions.role_id
      and rbac_role.tenant_id in (select public.current_tenant_ids())
  )
)
with check (
  exists (
    select 1
    from public.roles rbac_role
    where rbac_role.id = role_permissions.role_id
      and rbac_role.tenant_id in (select public.current_tenant_ids())
  )
);

drop policy if exists "members delete role permissions" on public.role_permissions;
create policy "members delete role permissions" on public.role_permissions
for delete to authenticated
using (
  exists (
    select 1
    from public.roles rbac_role
    where rbac_role.id = role_permissions.role_id
      and rbac_role.tenant_id in (select public.current_tenant_ids())
  )
);

drop policy if exists "members read audit logs" on public.audit_logs;
create policy "members read audit logs" on public.audit_logs
for select to authenticated
using (tenant_id in (select public.current_tenant_ids()));

drop policy if exists "members insert audit logs" on public.audit_logs;
create policy "members insert audit logs" on public.audit_logs
for insert to authenticated
with check (
  tenant_id in (select public.current_tenant_ids())
  and (user_id is null or user_id = auth.uid())
);

grant select on public.permissions to authenticated;
grant select, insert, update, delete on public.roles to authenticated;
grant select, insert, update, delete on public.role_permissions to authenticated;
grant select, insert on public.audit_logs to authenticated;

insert into public.permissions (id, description)
values
  ('orders:read', 'View orders and order details.'),
  ('orders:write', 'Create and update orders.'),
  ('customers:read', 'View customers and conversations.'),
  ('customers:write', 'Create and update customer records.'),
  ('products:read', 'View products, categories, and inventory.'),
  ('products:write', 'Create and update products, categories, and inventory.'),
  ('settings:manage', 'Manage tenant settings and integrations.'),
  ('team:manage', 'Manage team members, roles, and permissions.'),
  ('reports:read', 'View reports and analytics.'),
  ('messages:read', 'View WhatsApp conversations and messages.'),
  ('messages:write', 'Send and manage WhatsApp messages.')
on conflict (id) do update
set description = excluded.description;

insert into public.roles (tenant_id, name, is_system)
select tenant.id, role_name.name, true
from public.tenants tenant
cross join (values
  ('owner'),
  ('admin'),
  ('manager'),
  ('cashier')
) as role_name(name)
on conflict (tenant_id, name) do update
set is_system = true;

with role_permission_matrix(role_name, permission_id) as (
  values
    ('owner', 'orders:read'),
    ('owner', 'orders:write'),
    ('owner', 'customers:read'),
    ('owner', 'customers:write'),
    ('owner', 'products:read'),
    ('owner', 'products:write'),
    ('owner', 'settings:manage'),
    ('owner', 'team:manage'),
    ('owner', 'reports:read'),
    ('owner', 'messages:read'),
    ('owner', 'messages:write'),
    ('admin', 'orders:read'),
    ('admin', 'orders:write'),
    ('admin', 'customers:read'),
    ('admin', 'customers:write'),
    ('admin', 'products:read'),
    ('admin', 'products:write'),
    ('admin', 'settings:manage'),
    ('admin', 'team:manage'),
    ('admin', 'reports:read'),
    ('admin', 'messages:read'),
    ('admin', 'messages:write'),
    ('manager', 'orders:read'),
    ('manager', 'orders:write'),
    ('manager', 'customers:read'),
    ('manager', 'customers:write'),
    ('manager', 'products:read'),
    ('manager', 'products:write'),
    ('manager', 'reports:read'),
    ('manager', 'messages:read'),
    ('manager', 'messages:write'),
    ('cashier', 'orders:read'),
    ('cashier', 'orders:write'),
    ('cashier', 'customers:read'),
    ('cashier', 'products:read'),
    ('cashier', 'messages:read'),
    ('cashier', 'messages:write')
)
insert into public.role_permissions (role_id, permission_id)
select rbac_role.id, matrix.permission_id
from public.roles rbac_role
join role_permission_matrix matrix on matrix.role_name = rbac_role.name
where rbac_role.is_system = true
on conflict (role_id, permission_id) do nothing;

commit;
