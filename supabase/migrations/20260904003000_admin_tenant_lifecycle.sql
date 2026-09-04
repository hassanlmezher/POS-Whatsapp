begin;

alter table public.tenants add column if not exists status text;
alter table public.tenants add column if not exists subscription_status text;
alter table public.tenants add column if not exists trial_starts_at timestamptz;
alter table public.tenants add column if not exists trial_ends_at timestamptz;

update public.tenants
set status = coalesce(status, 'active'),
    subscription_status = coalesce(subscription_status, 'trialing'),
    trial_starts_at = coalesce(trial_starts_at, created_at, now()),
    trial_ends_at = coalesce(trial_ends_at, coalesce(created_at, now()) + interval '14 days');

alter table public.tenants alter column status set default 'active';
alter table public.tenants alter column subscription_status set default 'trialing';
alter table public.tenants alter column trial_starts_at set default now();
alter table public.tenants alter column trial_ends_at set default (now() + interval '14 days');

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tenants'::regclass
      and conname = 'tenants_status_check'
  ) then
    alter table public.tenants
      add constraint tenants_status_check
      check (status in ('active', 'suspended'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.tenants'::regclass
      and conname = 'tenants_subscription_status_check'
  ) then
    alter table public.tenants
      add constraint tenants_subscription_status_check
      check (subscription_status in ('trialing', 'active', 'past_due', 'cancelled'));
  end if;
end $$;

create index if not exists idx_tenants_status on public.tenants(status);
create index if not exists idx_tenants_subscription_status on public.tenants(subscription_status);

commit;
