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

insert into customers (id, company_id, name, phone, whatsapp_phone, avatar_url, notes, tags)
values
('55555555-5555-4555-8555-555555555551', '11111111-1111-4111-8111-111111111111', 'Sarah Jenkins', '+1 (555) 0123-4567', '155501234567', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80', 'Prefers local organic produce. Usually orders on Tuesday mornings.', array['loyal customer']),
('55555555-5555-4555-8555-555555555552', '11111111-1111-4111-8111-111111111111', 'Marcus Low', '+1 (555) 0991-1122', '15550991122', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80', 'Asks for delivery updates on high-value orders.', array['vip'])
on conflict (id) do update
set name = excluded.name,
    phone = excluded.phone,
    whatsapp_phone = excluded.whatsapp_phone,
    avatar_url = excluded.avatar_url,
    notes = excluded.notes,
    tags = excluded.tags;

insert into conversations (id, company_id, customer_id, status, last_message, last_message_at, last_inbound_at, unread_count)
values
('66666666-6666-4666-8666-666666666661', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555551', 'open', 'When will my organic honey ship?', now() - interval '8 minutes', now() - interval '8 minutes', 1),
('66666666-6666-4666-8666-666666666662', '11111111-1111-4111-8111-111111111111', '55555555-5555-4555-8555-555555555552', 'pending', 'Is the Arabica blend back in stock?', now() - interval '35 minutes', now() - interval '35 minutes', 0)
on conflict (id) do update
set status = excluded.status,
    last_message = excluded.last_message,
    last_message_at = excluded.last_message_at,
    last_inbound_at = excluded.last_inbound_at,
    unread_count = excluded.unread_count;

insert into messages (id, company_id, conversation_id, customer_id, direction, body, status, created_at)
values
('77777777-7777-4777-8777-777777777771', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666661', '55555555-5555-4555-8555-555555555551', 'inbound', 'Hi there! I placed an order this morning. Can I add organic sourdough before it ships?', 'received', now() - interval '12 minutes'),
('77777777-7777-4777-8777-777777777772', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666661', '55555555-5555-4555-8555-555555555551', 'inbound', 'When will my organic honey ship?', 'received', now() - interval '8 minutes'),
('77777777-7777-4777-8777-777777777773', '11111111-1111-4111-8111-111111111111', '66666666-6666-4666-8666-666666666662', '55555555-5555-4555-8555-555555555552', 'inbound', 'Is the Arabica blend back in stock?', 'received', now() - interval '35 minutes')
on conflict (id) do nothing;
