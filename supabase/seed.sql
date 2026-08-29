begin;

insert into public.tenants (
  name,
  slug
)
values (
  'InChouf Test Business',
  'inchouf-test-business'
)
on conflict (slug) do update
set name = excluded.name;

insert into public.tenant_users (auth_user_id, tenant_id, name, role)
select '1403bae7-dacc-4844-b4ff-032bde8296d7'::uuid, id, 'Test Admin', 'owner'::public.app_role
from public.tenants
where slug = 'inchouf-test-business'
on conflict (auth_user_id) do update
set tenant_id = excluded.tenant_id,
    name = excluded.name,
    role = excluded.role;

insert into public.branches (tenant_id, name, address)
select id, 'Main Branch', null
from public.tenants
where slug = 'inchouf-test-business'
on conflict (tenant_id, name) do nothing;

commit;

select
  tenant.id as tenant_id,
  tenant.name as tenant_name,
  tenant.slug as tenant_slug,
  tenant.whatsapp_phone_number,
  tenant.whatsapp_phone_number_id,
  tenant.whatsapp_business_account_id,
  membership.auth_user_id,
  auth_user.email,
  membership.name as user_name,
  membership.role
from public.tenants tenant
join public.tenant_users membership on membership.tenant_id = tenant.id
join auth.users auth_user on auth_user.id = membership.auth_user_id
where tenant.slug = 'inchouf-test-business'
  and membership.auth_user_id = '1403bae7-dacc-4844-b4ff-032bde8296d7'::uuid;
