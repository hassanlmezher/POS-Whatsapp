begin;

create table if not exists public.super_admins (
  id uuid primary key references auth.users(id) on delete cascade
);

alter table public.super_admins enable row level security;

create or replace function public.current_user_is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.super_admins super_admin
    where super_admin.id = auth.uid()
  )
$$;

revoke all on function public.current_user_is_super_admin() from public;
grant execute on function public.current_user_is_super_admin() to authenticated;

drop policy if exists "super admins read super admins" on public.super_admins;
create policy "super admins read super admins" on public.super_admins
for select to authenticated
using (public.current_user_is_super_admin());

drop policy if exists "supabase auth admin reads super admins" on public.super_admins;
create policy "supabase auth admin reads super admins" on public.super_admins
for select to supabase_auth_admin
using (true);

drop policy if exists "supabase auth admin reads tenant users" on public.tenant_users;
create policy "supabase auth admin reads tenant users" on public.tenant_users
for select to supabase_auth_admin
using (true);

drop policy if exists "supabase auth admin reads roles" on public.roles;
create policy "supabase auth admin reads roles" on public.roles
for select to supabase_auth_admin
using (true);

drop policy if exists "supabase auth admin reads role permissions" on public.role_permissions;
create policy "supabase auth admin reads role permissions" on public.role_permissions
for select to supabase_auth_admin
using (true);

create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb := event->'claims';
  app_metadata jsonb := coalesce(claims->'app_metadata', '{}'::jsonb);
  jwt_permissions text[] := '{}'::text[];
  jwt_role_id uuid;
  jwt_tenant_id uuid;
  user_is_super_admin boolean := false;
begin
  select exists (
    select 1
    from public.super_admins super_admin
    where super_admin.id = (event->>'user_id')::uuid
  )
  into user_is_super_admin;

  select
    membership.tenant_id,
    rbac_role.id,
    coalesce(
      array_agg(distinct role_permission.permission_id order by role_permission.permission_id)
        filter (where role_permission.permission_id is not null),
      '{}'::text[]
    )
  into jwt_tenant_id, jwt_role_id, jwt_permissions
  from public.tenant_users membership
  left join public.roles rbac_role
    on rbac_role.tenant_id = membership.tenant_id
   and rbac_role.name = membership.role::text
  left join public.role_permissions role_permission
    on role_permission.role_id = rbac_role.id
  where membership.auth_user_id = (event->>'user_id')::uuid
  group by membership.tenant_id, rbac_role.id
  limit 1;

  app_metadata := app_metadata - 'tenant_id' - 'role_id';
  app_metadata := jsonb_set(app_metadata, '{permissions}', to_jsonb(coalesce(jwt_permissions, '{}'::text[])), true);
  app_metadata := jsonb_set(app_metadata, '{is_super_admin}', to_jsonb(user_is_super_admin), true);

  if jwt_tenant_id is not null then
    app_metadata := jsonb_set(app_metadata, '{tenant_id}', to_jsonb(jwt_tenant_id::text), true);
  end if;

  if jwt_role_id is not null then
    app_metadata := jsonb_set(app_metadata, '{role_id}', to_jsonb(jwt_role_id::text), true);
  end if;

  claims := jsonb_set(claims, '{app_metadata}', app_metadata, true);

  return jsonb_build_object('claims', claims);
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
grant select on public.super_admins, public.tenant_users, public.roles, public.role_permissions to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;

grant select on public.super_admins to authenticated;

commit;
