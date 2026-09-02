# InChouf POS Project Instructions

## Product
InChouf POS is a multi-tenant SaaS POS with WhatsApp integration.

Each business is a separate tenant. Users, messages, orders, customers, settings, and WhatsApp data must remain isolated by tenant.

## Stack
- Next.js 15
- TypeScript
- Supabase Postgres
- Supabase Auth
- Drizzle ORM
- Vercel
- Playwright

## Critical Rules
- Never allow cross-tenant data access.
- Every tenant-scoped query and mutation must enforce tenant ownership.
- Never trust tenant IDs, user IDs, phone numbers, or permissions from the client without server-side validation.
- Protect authentication and authorization boundaries.
- Never expose secrets, service-role keys, webhook secrets, or sensitive customer data.
- Avoid destructive database changes unless explicitly requested.
- Preserve existing functionality unless the task requires changing it.

## WhatsApp
- Each tenant has its own WhatsApp phone number.
- Incoming WhatsApp messages must route only to the tenant that owns the receiving number.
- Outgoing messages must use the correct tenant's WhatsApp configuration.
- Respect WhatsApp messaging rules, template requirements, webhook verification, media handling, and error states.

## Engineering
- Follow the existing architecture and patterns.
- Reuse existing components, utilities, schemas, and services.
- Prefer small, complete changes over large rewrites.
- Use strong TypeScript typing.
- Validate inputs at trust boundaries.
- Handle loading, empty, success, and error states where relevant.
- Add or update tests for important behavior.

## Verification
For changed functionality, run the smallest relevant combination of:
- tests
- typecheck
- lint
- build

For tenant-sensitive changes, explicitly verify that one tenant cannot read or mutate another tenant's data.

## Task Behavior
Before implementing a non-trivial task:
1. Inspect only the relevant code.
2. Identify the existing data flow and authorization boundary.
3. Implement the smallest robust solution.
4. Verify it.
5. Report briefly what changed and what was verified.