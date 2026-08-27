begin;

insert into public.tenants (
  name,
  slug,
  whatsapp_phone_number,
  whatsapp_phone_number_id,
  whatsapp_business_account_id
)
values (
  'InChouf Test Business',
  'inchouf-test-business',
  '+15556288392',
  '1187894504402965',
  '947626701589920'
)
on conflict (slug) do update
set name = excluded.name,
    whatsapp_phone_number = excluded.whatsapp_phone_number,
    whatsapp_phone_number_id = excluded.whatsapp_phone_number_id,
    whatsapp_business_account_id = excluded.whatsapp_business_account_id;

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

insert into public.product_categories (tenant_id, name, icon, sort_order)
select id, 'Test Products', 'Package', 0
from public.tenants
where slug = 'inchouf-test-business'
on conflict (tenant_id, name) do nothing;

insert into public.products (tenant_id, category_id, name, sku, price, active)
select tenant.id, category.id, 'Isolation Test Product A', 'TEST-A-001', 10.00, true
from public.tenants tenant
join public.product_categories category
  on category.tenant_id = tenant.id and category.name = 'Test Products'
where tenant.slug = 'inchouf-test-business'
on conflict (tenant_id, sku) do update
set name = excluded.name,
    category_id = excluded.category_id,
    price = excluded.price,
    active = excluded.active;

insert into public.inventory (tenant_id, branch_id, product_id, quantity, reorder_level)
select tenant.id, branch.id, product.id, 25, 5
from public.tenants tenant
join public.branches branch
  on branch.tenant_id = tenant.id and branch.name = 'Main Branch'
join public.products product
  on product.tenant_id = tenant.id and product.sku = 'TEST-A-001'
where tenant.slug = 'inchouf-test-business'
on conflict (tenant_id, branch_id, product_id) do update
set quantity = excluded.quantity,
    reorder_level = excluded.reorder_level;

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
