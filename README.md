# Merchant OS

Merchant OS is a desktop-first SaaS POS foundation with a WhatsApp-style customer inbox.

## Architecture

- `src/app/(app)`: protected product modules for Dashboard, POS, Inbox, Orders, Customers, and Settings.
- `src/components`: reusable app shell, UI primitives, and feature components.
- `src/lib/data`: authenticated repository boundary. Every query uses the tenant resolved from `tenant_users`.
- `src/lib/stores`: client state for POS cart and inbox message state.
- `src/lib/supabase`: browser/server/admin Supabase clients and realtime subscriptions.
- `src/app/api`: checkout, outbound message, and WhatsApp webhook route handlers.
- `supabase/schema.sql`: PostgreSQL schema with relationships, indexes, enums, and RLS starting policies.
- `supabase/seed.sql`: database seed data for local development.

## Environment

Copy `.env.example` to `.env.local` and fill:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
WHATSAPP_ACCESS_TOKEN=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Local Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL editor.
3. Run `supabase/seed.sql` for local development data.
4. Create users in Supabase Auth and link each UUID in `tenant_users`.
5. Realtime for `messages` is added by the schema script.

## WhatsApp Cloud API Flow

1. A tenant stores its display phone, Meta Business Account ID, and `phone_number_id` in `tenants`.
2. Meta verifies `GET /api/whatsapp/webhook` using `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
3. Meta posts incoming messages/status updates to `POST /api/whatsapp/webhook`.
4. The webhook stores the raw event in `whatsapp_webhook_events`.
5. Incoming messages resolve `phone_number_id` to `tenant_id`, upsert a customer by normalized WhatsApp phone, open/update a conversation, and insert a message row.
6. Supabase Realtime broadcasts the inserted message to active inbox clients.
7. Replies use the authenticated tenant's database `phone_number_id`, enforce the 24-hour service window, call Graph API `/PHONE_NUMBER_ID/messages`, and save the outbound message.
8. Delivery/read webhooks update `messages.status`, `delivered_at`, and `read_at`.

## Production Checklist

1. Add tenant invitation and admin user-management flows.
2. Move WhatsApp access tokens into Supabase Vault or an external secrets manager.
3. Verify Meta webhook signatures with `WHATSAPP_APP_SECRET`.
4. Convert checkout to a PostgreSQL RPC transaction for order, payment, and inventory updates.
5. Add role-specific RLS write policies for managers, cashiers, and support agents.
6. Add message template support for conversations outside the 24-hour window.
7. Add Playwright coverage for POS checkout and inbox reply flows.
8. Add observability for webhook failures, checkout errors, and outbound message delivery.
