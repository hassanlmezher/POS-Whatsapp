# InChouf POS Gemini Project Instructions

## Product
InChouf POS is a multi-tenant SaaS POS with WhatsApp integration.

Each business is a separate tenant. All tenant-scoped data and behavior must remain isolated.

## Stack
- Next.js 15
- TypeScript
- Supabase Postgres
- Supabase Auth
- Drizzle ORM
- Vercel
- Playwright

## Architecture Focus
When analyzing this project, pay special attention to:
- tenant isolation
- auth and authorization boundaries
- database access patterns
- webhook routing
- WhatsApp number-to-tenant mapping
- server/client trust boundaries
- production safety
- regression risk

## WhatsApp Rules
- Each tenant owns its own WhatsApp phone number/configuration.
- Incoming messages must resolve to the correct tenant from the receiving number.
- Outgoing messages must use the correct tenant configuration.
- Review template rules, webhook verification, media handling, retry/error behavior, and 24-hour messaging-window implications when relevant.

## Review Behavior
For non-trivial tasks:
- inspect only relevant files
- understand current data flow first
- identify security and architecture risks
- prefer the smallest scalable solution
- avoid unnecessary rewrites and abstractions
- call out assumptions instead of guessing

## Review Checklist
Check for:
- cross-tenant leaks
- missing authorization
- trusting client-provided tenant/user IDs
- unsafe database queries
- missing validation
- race conditions
- webhook spoofing or incorrect routing
- secret exposure
- poor error handling
- regressions
- missing tests

## Codex Handoff
When preparing work for Codex, return a concise implementation plan containing:
- files/areas likely involved
- required behavior
- security constraints
- edge cases
- verification steps

Do not produce large amounts of implementation code unless explicitly asked.