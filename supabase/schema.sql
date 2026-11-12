-- MOONWATCH: Sol 214 — Supabase Database Schema & Row Level Security
-- Target project: bqbvmluwatdgxbiqvnsx (junior-astronaut)

-- 1. Cached, normalized NASA DONKI space-weather events
create table if not exists public.donki_cache (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('FLR', 'CME', 'GST')),
  event_key text not null unique,
  start_time timestamptz,
  payload jsonb not null,
  fetched_at timestamptz default now()
);

-- 2. Anonymous run telemetry results
create table if not exists public.runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  level int not null check (level between 1 and 3),
  seed bigint not null,
  event_source text not null check (event_source in ('live', 'snapshot')),
  outcome text not null check (outcome in ('won', 'lost')),
  sols_survived int not null check (sols_survived >= 0 and sols_survived <= 100),
  primary_cause text,
  client_id uuid
);

-- 3. Enable Row Level Security (RLS)
alter table public.donki_cache enable row level security;
alter table public.runs enable row level security;

-- 4. RLS Policies
drop policy if exists "read cache" on public.donki_cache;
create policy "read cache" on public.donki_cache
  for select
  to anon, authenticated
  using (true);

drop policy if exists "insert runs" on public.runs;
create policy "insert runs" on public.runs
  for insert
  to anon, authenticated
  with check (
    level between 1 and 3
    and sols_survived >= 0
    and sols_survived <= 100
    and outcome in ('won', 'lost')
    and event_source in ('live', 'snapshot')
  );

-- 5. Aggregated view with security_invoker = true
create or replace view public.run_stats
with (security_invoker = true) as
select
  level,
  outcome,
  coalesce(primary_cause, 'none') as primary_cause,
  count(*)::int as run_count,
  round(avg(sols_survived), 1) as avg_sols_survived
from public.runs
group by level, outcome, coalesce(primary_cause, 'none');

grant select on public.run_stats to anon, authenticated;
