insert into companies (id, name, legal_name, currency, tax_rate, timezone)
values ('11111111-1111-4111-8111-111111111111', 'GreenStore POS', 'GreenStore LLC', 'USD', 0.08, 'America/New_York')
on conflict (id) do nothing;

insert into branches (id, company_id, name, address)
values ('22222222-2222-4222-8222-222222222222', '11111111-1111-4111-8111-111111111111', 'Main Branch', '100 Market Street')
on conflict (id) do nothing;

insert into terminals (company_id, branch_id, name, code)
values ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', 'Front Register', 'TERMINAL-04')
on conflict (company_id, code) do nothing;

insert into product_categories (id, company_id, name, icon, sort_order)
values
('33333333-3333-4333-8333-333333333331', '11111111-1111-4111-8111-111111111111', 'Electronics', 'MonitorSmartphone', 1),
('33333333-3333-4333-8333-333333333332', '11111111-1111-4111-8111-111111111111', 'Fashion', 'Shirt', 2),
('33333333-3333-4333-8333-333333333333', '11111111-1111-4111-8111-111111111111', 'Home', 'House', 3)
on conflict (id) do nothing;

insert into products (id, company_id, category_id, name, sku, price, image_url)
values
('44444444-4444-4444-8444-444444444441', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333331', 'Wireless Headphones Pro', 'AUD-1001', 299.00, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=500&q=80'),
('44444444-4444-4444-8444-444444444442', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333332', 'Classic Minimalist Watch', 'FAS-2210', 150.00, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=500&q=80'),
('44444444-4444-4444-8444-444444444443', '11111111-1111-4111-8111-111111111111', '33333333-3333-4333-8333-333333333333', 'Artisan Ceramic Mug', 'HOM-9011', 24.00, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=500&q=80')
on conflict (id) do nothing;

insert into inventory (company_id, branch_id, product_id, quantity, reorder_level)
values
('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444441', 100, 10),
('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444442', 100, 10),
('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222', '44444444-4444-4444-8444-444444444443', 100, 10)
on conflict (company_id, branch_id, product_id) do update
set quantity = greatest(inventory.quantity, excluded.quantity),
    reorder_level = excluded.reorder_level;
